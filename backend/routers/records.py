from math import ceil
import re
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from database import get_db
from models import User, HostedZone, DNSRecord
from schemas import (
    APIResponse,
    DNSRecordCreate,
    DNSRecordUpdate,
    DNSRecordResponse,
    PaginatedData
)
from routers.auth import get_current_user

router = APIRouter(prefix="/api/zones/{zone_id}/records", tags=["DNS Records"])

async def check_cname_constraint(
    zone_id: str,
    name: str,
    record_type: str,
    db: AsyncSession,
    exclude_record_id: Optional[str] = None
):
    query = select(DNSRecord).where(
        DNSRecord.zone_id == zone_id,
        DNSRecord.name == name
    )
    if exclude_record_id:
        query = query.where(DNSRecord.id != exclude_record_id)
        
    result = await db.execute(query)
    existing_records = result.scalars().all()
    
    if not existing_records:
        return
        
    if record_type == "CNAME":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A CNAME record already exists or cannot coexist with other record types for the name '{name}'."
        )
    else:
        for r in existing_records:
            if r.type == "CNAME":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cannot create record type '{record_type}' because a CNAME record already exists for the name '{name}'."
                )

async def update_zone_record_count(zone_id: str, db: AsyncSession):
    count_query = select(func.count(DNSRecord.id)).where(DNSRecord.zone_id == zone_id)
    count_result = await db.execute(count_query)
    count = count_result.scalar() or 0
    
    zone_query = select(HostedZone).where(HostedZone.id == zone_id)
    zone_result = await db.execute(zone_query)
    zone = zone_result.scalars().first()
    if zone:
        zone.record_count = count
        await db.commit()

@router.get("", response_model=APIResponse[PaginatedData[DNSRecordResponse]])
async def get_records(
    zone_id: str,
    search: str = Query("", description="Search term for record name or value"),
    type: str = Query("", description="Filter by record type (A, CNAME, etc.)"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    zone_result = await db.execute(select(HostedZone).where(HostedZone.id == zone_id))
    zone = zone_result.scalars().first()
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hosted Zone not found"
        )
        
    query = select(DNSRecord).where(DNSRecord.zone_id == zone_id)
    if search:
        s = f"%{search.strip().lower()}%"
        query = query.where(
            (DNSRecord.name.like(s)) | (DNSRecord.value.like(s))
        )
    if type:
        query = query.where(DNSRecord.type == type)
    query = query.order_by(DNSRecord.name.asc(), DNSRecord.type.asc())
    
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    offset = (page - 1) * limit
    paginated_query = query.offset(offset).limit(limit)
    result = await db.execute(paginated_query)
    records = result.scalars().all()
    
    total_pages = ceil(total / limit) if total > 0 else 1
    record_responses = [DNSRecordResponse.model_validate(r) for r in records]
    
    paginated_data = PaginatedData(
        data=record_responses,
        total=total,
        page=page,
        total_pages=total_pages
    )
    
    return APIResponse(
        data=paginated_data,
        message="DNS records retrieved successfully",
        error=None
    )


@router.post("", response_model=APIResponse[DNSRecordResponse], status_code=status.HTTP_201_CREATED)
async def create_record(
    zone_id: str,
    record_data: DNSRecordCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    zone_result = await db.execute(select(HostedZone).where(HostedZone.id == zone_id))
    zone = zone_result.scalars().first()
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hosted Zone not found"
        )
        
    normalized_name = record_data.name.strip().lower()
    
    await check_cname_constraint(
        zone_id=zone_id,
        name=normalized_name,
        record_type=record_data.type,
        db=db
    )
    
    if record_data.routing_policy == "Simple":
        dup_result = await db.execute(
            select(DNSRecord).where(
                DNSRecord.zone_id == zone_id,
                DNSRecord.name == normalized_name,
                DNSRecord.type == record_data.type,
                DNSRecord.routing_policy == "Simple"
            )
        )
        if dup_result.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A Simple record with type '{record_data.type}' and name '{normalized_name}' already exists."
            )
            
    new_record = DNSRecord(
        zone_id=zone_id,
        name=normalized_name,
        type=record_data.type,
        ttl=record_data.ttl,
        value=record_data.value.strip(),
        routing_policy=record_data.routing_policy,
        weight=record_data.weight,
        region=record_data.region,
        failover=record_data.failover
    )
    
    db.add(new_record)
    await db.commit()
    
    await update_zone_record_count(zone_id, db)
    await db.refresh(new_record)
    
    return APIResponse(
        data=DNSRecordResponse.model_validate(new_record),
        message="DNS record created successfully",
        error=None
    )


@router.put("/{record_id}", response_model=APIResponse[DNSRecordResponse])
async def update_record(
    zone_id: str,
    record_id: str,
    record_data: DNSRecordUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    zone_result = await db.execute(select(HostedZone).where(HostedZone.id == zone_id))
    if not zone_result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hosted Zone not found"
        )
        
    record_result = await db.execute(
        select(DNSRecord).where(
            DNSRecord.id == record_id,
            DNSRecord.zone_id == zone_id
        )
    )
    record = record_result.scalars().first()
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="DNS record not found"
        )
        
    normalized_name = record_data.name.strip().lower()
    
    await check_cname_constraint(
        zone_id=zone_id,
        name=normalized_name,
        record_type=record_data.type,
        db=db,
        exclude_record_id=record_id
    )
    
    record.name = normalized_name
    record.type = record_data.type
    record.ttl = record_data.ttl
    record.value = record_data.value.strip()
    record.routing_policy = record_data.routing_policy
    record.weight = record_data.weight
    record.region = record_data.region
    record.failover = record_data.failover
    
    await db.commit()
    await db.refresh(record)
    
    return APIResponse(
        data=DNSRecordResponse.model_validate(record),
        message="DNS record updated successfully",
        error=None
    )


@router.delete("/{record_id}", response_model=APIResponse[None])
async def delete_record(
    zone_id: str,
    record_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    zone_result = await db.execute(select(HostedZone).where(HostedZone.id == zone_id))
    if not zone_result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hosted Zone not found"
        )
        
    record_result = await db.execute(
        select(DNSRecord).where(
            DNSRecord.id == record_id,
            DNSRecord.zone_id == zone_id
        )
    )
    record = record_result.scalars().first()
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="DNS record not found"
        )
        
    await db.delete(record)
    await db.commit()
    
    await update_zone_record_count(zone_id, db)
    
    return APIResponse(
        data=None,
        message="DNS record deleted successfully",
        error=None
    )


# Export Zone
@router.get("/export", response_model=APIResponse[dict])
async def export_zone(
    zone_id: str,
    format: str = Query("bind", description="Format to export: 'bind' or 'json'"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    zone_result = await db.execute(select(HostedZone).where(HostedZone.id == zone_id))
    zone = zone_result.scalars().first()
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hosted Zone not found"
        )
        
    records_result = await db.execute(
        select(DNSRecord).where(DNSRecord.zone_id == zone_id).order_by(DNSRecord.name.asc(), DNSRecord.type.asc())
    )
    records = records_result.scalars().all()
    
    if format == "json":
        data = {
            "zone": {
                "id": zone.id,
                "name": zone.name,
                "type": zone.type,
                "comment": zone.comment
            },
            "records": [
                {
                    "name": r.name,
                    "type": r.type,
                    "ttl": r.ttl,
                    "value": r.value,
                    "routing_policy": r.routing_policy,
                    "weight": r.weight,
                    "region": r.region,
                    "failover": r.failover
                } for r in records
            ]
        }
        return APIResponse(
            data=data,
            message="Zone exported successfully as JSON",
            error=None
        )
    else:
        bind_lines = []
        bind_lines.append(f"; BIND zone file for {zone.name}")
        bind_lines.append(f"; Generated by AWS Route53 Clone Console")
        bind_lines.append(f"; Zone ID: {zone.id}")
        bind_lines.append(f"; Type: {zone.type}")
        bind_lines.append(f"")
        
        for r in records:
            values = r.value.split('\n')
            for val in values:
                name_col = r.name if r.name else "@"
                bind_lines.append(f"{name_col:<30} {r.ttl:<8} IN  {r.type:<6} {val}")
                
        bind_text = "\n".join(bind_lines)
        return APIResponse(
            data={"bind_content": bind_text, "filename": f"{zone.name}.zone"},
            message="Zone exported successfully as BIND format",
            error=None
        )


# Import Zone
@router.post("/import", response_model=APIResponse[dict])
async def import_zone(
    zone_id: str,
    import_data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    zone_result = await db.execute(select(HostedZone).where(HostedZone.id == zone_id))
    zone = zone_result.scalars().first()
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hosted Zone not found"
        )
        
    content = import_data.get("zone_file_content", "")
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No zone file content provided"
        )
        
    lines = content.split('\n')
    imported_count = 0
    failed_count = 0
    errors = []
    
    default_ttl = 300
    
    for line_idx, line in enumerate(lines):
        line = line.strip()
        if not line or line.startswith(";"):
            continue
            
        if line.upper().startswith("$TTL"):
            parts = line.split()
            if len(parts) >= 2 and parts[1].isdigit():
                default_ttl = int(parts[1])
            continue
            
        if line.upper().startswith("$ORIGIN"):
            continue
            
        try:
            tokens = line.split()
            if len(tokens) < 2:
                continue
                
            name = tokens[0]
            curr_idx = 1
            
            ttl = default_ttl
            if tokens[curr_idx].isdigit():
                ttl = int(tokens[curr_idx])
                curr_idx += 1
                
            if curr_idx < len(tokens) and tokens[curr_idx].upper() == "IN":
                curr_idx += 1
                
            if curr_idx >= len(tokens):
                continue
            rec_type = tokens[curr_idx].upper()
            curr_idx += 1
            
            type_pattern = re.compile(rf"\b{rec_type}\b", re.IGNORECASE)
            search_match = type_pattern.search(line)
            if not search_match:
                continue
                
            value = line[search_match.end():].strip()
            
            if rec_type not in {"A", "AAAA", "CNAME", "TXT", "MX", "NS", "PTR", "SRV", "CAA"}:
                continue
                
            if name == "@":
                name = zone.name
                
            await check_cname_constraint(
                zone_id=zone_id,
                name=name,
                record_type=rec_type,
                db=db
            )
            
            new_rec = DNSRecord(
                zone_id=zone_id,
                name=name.lower(),
                type=rec_type,
                ttl=ttl,
                value=value,
                routing_policy="Simple"
            )
            db.add(new_rec)
            imported_count += 1
            
        except Exception as e:
            failed_count += 1
            errors.append(f"Line {line_idx + 1}: {str(e)}")
            
    if imported_count > 0:
        await db.commit()
        await update_zone_record_count(zone_id, db)
        
    return APIResponse(
        data={
            "imported_count": imported_count,
            "failed_count": failed_count,
            "errors": errors
        },
        message=f"Import completed: {imported_count} records imported, {failed_count} failed",
        error=None if not errors else "Some lines failed to import"
    )
