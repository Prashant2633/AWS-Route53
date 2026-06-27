from math import ceil
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from database import get_db
from models import User, HostedZone, DNSRecord
from schemas import (
    APIResponse,
    HostedZoneCreate,
    HostedZoneUpdate,
    HostedZoneResponse,
    PaginatedData
)
from routers.auth import get_current_user

router = APIRouter(prefix="/api/zones", tags=["Hosted Zones"])

@router.get("", response_model=APIResponse[PaginatedData[HostedZoneResponse]])
async def get_zones(
    search: str = Query("", description="Search term for zone name"),
    type: str = Query("", description="Filter by Public or Private"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(HostedZone)
    if search:
        query = query.where(HostedZone.name.like(f"%{search.strip().lower()}%"))
    if type:
        query = query.where(HostedZone.type == type)
    query = query.order_by(HostedZone.name.asc())
    
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    offset = (page - 1) * limit
    paginated_query = query.offset(offset).limit(limit)
    result = await db.execute(paginated_query)
    zones = result.scalars().all()
    
    total_pages = ceil(total / limit) if total > 0 else 1
    zone_responses = [HostedZoneResponse.model_validate(z) for z in zones]
    
    paginated_data = PaginatedData(
        data=zone_responses,
        total=total,
        page=page,
        total_pages=total_pages
    )
    
    return APIResponse(
        data=paginated_data,
        message="Hosted zones retrieved successfully",
        error=None
    )


@router.post("", response_model=APIResponse[HostedZoneResponse], status_code=status.HTTP_201_CREATED)
async def create_zone(
    zone_data: HostedZoneCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    existing_result = await db.execute(
        select(HostedZone).where(HostedZone.name == zone_data.name)
    )
    existing_zone = existing_result.scalars().first()
    if existing_zone:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Hosted Zone '{zone_data.name}' already exists."
        )
        
    new_zone = HostedZone(
        name=zone_data.name,
        type=zone_data.type,
        comment=zone_data.comment,
        record_count=2
    )
    db.add(new_zone)
    await db.flush()
    
    ns_record = DNSRecord(
        zone_id=new_zone.id,
        name=new_zone.name,
        type="NS",
        ttl=172800,
        value="ns-1.awsdns-01.com.\nns-2.awsdns-02.org.\nns-3.awsdns-03.net.\nns-4.awsdns-04.co.uk.",
        routing_policy="Simple"
    )
    
    soa_record = DNSRecord(
        zone_id=new_zone.id,
        name=new_zone.name,
        type="SOA",
        ttl=900,
        value=f"ns-1.awsdns-01.com. awsdns-hostmaster.amazon.com. 1 7200 900 1209600 86400",
        routing_policy="Simple"
    )
    
    db.add(ns_record)
    db.add(soa_record)
    await db.commit()
    await db.refresh(new_zone)
    
    return APIResponse(
        data=HostedZoneResponse.model_validate(new_zone),
        message="Hosted zone created successfully with default NS/SOA records",
        error=None
    )


@router.get("/{zone_id}", response_model=APIResponse[HostedZoneResponse])
async def get_zone(
    zone_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(HostedZone).where(HostedZone.id == zone_id)
    )
    zone = result.scalars().first()
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hosted Zone not found"
        )
        
    return APIResponse(
        data=HostedZoneResponse.model_validate(zone),
        message="Hosted zone retrieved successfully",
        error=None
    )


@router.put("/{zone_id}", response_model=APIResponse[HostedZoneResponse])
async def update_zone(
    zone_id: str,
    zone_update: HostedZoneUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(HostedZone).where(HostedZone.id == zone_id)
    )
    zone = result.scalars().first()
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hosted Zone not found"
        )
        
    if zone_update.comment is not None:
        zone.comment = zone_update.comment
        
    await db.commit()
    await db.refresh(zone)
    
    return APIResponse(
        data=HostedZoneResponse.model_validate(zone),
        message="Hosted zone updated successfully",
        error=None
    )


@router.delete("/{zone_id}", response_model=APIResponse[None])
async def delete_zone(
    zone_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(HostedZone).where(HostedZone.id == zone_id)
    )
    zone = result.scalars().first()
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hosted Zone not found"
        )
        
    await db.delete(zone)
    await db.commit()
    
    return APIResponse(
        data=None,
        message="Hosted zone and associated records deleted successfully",
        error=None
    )
