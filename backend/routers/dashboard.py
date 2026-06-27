from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from database import get_db
from models import User, HostedZone, DNSRecord
from schemas import APIResponse, DashboardStats
from routers.auth import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

@router.get("/stats", response_model=APIResponse[DashboardStats])
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    zones_count_query = select(func.count(HostedZone.id))
    zones_result = await db.execute(zones_count_query)
    total_zones = zones_result.scalar() or 0
    
    public_query = select(func.count(HostedZone.id)).where(HostedZone.type == "Public")
    public_result = await db.execute(public_query)
    public_zones = public_result.scalar() or 0
    
    private_zones = total_zones - public_zones
    
    records_count_query = select(func.count(DNSRecord.id))
    records_result = await db.execute(records_count_query)
    total_records = records_result.scalar() or 0
    
    stats = DashboardStats(
        total_zones=total_zones,
        total_records=total_records,
        public_zones=public_zones,
        private_zones=private_zones
    )
    
    return APIResponse(
        data=stats,
        message="Dashboard statistics retrieved successfully",
        error=None
    )
