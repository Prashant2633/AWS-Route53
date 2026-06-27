import re
from typing import Generic, TypeVar, Optional, List, Any
from pydantic import BaseModel, Field, field_validator, model_validator

T = TypeVar('T')

# Standard Response Envelope
class APIResponse(BaseModel, Generic[T]):
    data: Optional[T] = None
    message: Optional[str] = None
    error: Optional[str] = None

# Paginated Response Data
class PaginatedData(BaseModel, Generic[T]):
    data: List[T]
    total: int
    page: int
    total_pages: int

# Auth Schemas
class LoginRequest(BaseModel):
    username: str
    password: str

class TokenData(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserResponse(BaseModel):
    id: str
    username: str
    created_at: str

    class Config:
        from_attributes = True

# Hosted Zone Schemas
ZONE_NAME_REGEX = re.compile(
    r"^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.[A-Za-z0-9-]{1,63})*\.[A-Za-z]{2,}\.?$"
)

class HostedZoneCreate(BaseModel):
    name: str
    type: str = Field(..., description="Must be 'Public' or 'Private'")
    comment: Optional[str] = None

    @field_validator("name")
    @classmethod
    def validate_zone_name(cls, v: str) -> str:
        if not ZONE_NAME_REGEX.match(v):
            raise ValueError("Invalid domain name format. Must be a valid domain (e.g. example.com).")
        return v.lower()

    @field_validator("type")
    @classmethod
    def validate_zone_type(cls, v: str) -> str:
        if v not in ("Public", "Private"):
            raise ValueError("Type must be either 'Public' or 'Private'.")
        return v

class HostedZoneUpdate(BaseModel):
    comment: Optional[str] = None

class HostedZoneResponse(BaseModel):
    id: str
    name: str
    type: str
    comment: Optional[str] = None
    record_count: int
    created_at: str

    class Config:
        from_attributes = True

# DNS Record Schemas
RECORD_TYPES = {"A", "AAAA", "CNAME", "TXT", "MX", "NS", "PTR", "SRV", "CAA"}
ROUTING_POLICIES = {"Simple", "Weighted", "Latency", "Failover"}

IPV4_REGEX = re.compile(r"^(\d{1,3}\.){3}\d{1,3}$")

class DNSRecordCreate(BaseModel):
    name: str
    type: str
    ttl: int = Field(300, ge=1, le=2147483647)
    value: str
    routing_policy: str = "Simple"
    weight: Optional[int] = Field(None, ge=0, le=255)
    region: Optional[str] = None
    failover: Optional[str] = None

    @field_validator("type")
    @classmethod
    def validate_record_type(cls, v: str) -> str:
        if v not in RECORD_TYPES:
            raise ValueError(f"Record type must be one of {', '.join(RECORD_TYPES)}")
        return v

    @field_validator("routing_policy")
    @classmethod
    def validate_routing_policy(cls, v: str) -> str:
        if v not in ROUTING_POLICIES:
            raise ValueError(f"Routing policy must be one of {', '.join(ROUTING_POLICIES)}")
        return v

    @field_validator("failover")
    @classmethod
    def validate_failover(cls, v: Optional[str]) -> Optional[str]:
        if v and v not in ("PRIMARY", "SECONDARY"):
            raise ValueError("Failover must be 'PRIMARY' or 'SECONDARY'")
        return v

    @model_validator(mode="after")
    def validate_record_value(self):
        t = self.type
        val = self.value.strip()

        if t == "A":
            if not IPV4_REGEX.match(val):
                raise ValueError("A record value must be a valid IPv4 address (e.g. 192.0.2.1).")
            octets = val.split('.')
            if any(int(o) > 255 for o in octets):
                raise ValueError("IPv4 octets must be between 0 and 255.")

        elif t == "AAAA":
            if ":" not in val:
                raise ValueError("AAAA record value must be a valid IPv6 address.")

        elif t == "CNAME":
            if not re.match(r"^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\.?$", val):
                raise ValueError("CNAME value must be a valid domain/hostname (e.g. web.example.com).")

        elif t == "MX":
            parts = val.split(None, 1)
            if len(parts) != 2:
                raise ValueError("MX record value must be in '<priority> <hostname>' format (e.g. '10 mail.example.com').")
            priority, hostname = parts
            if not priority.isdigit():
                raise ValueError("MX priority must be a number.")
            if not re.match(r"^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\.?$", hostname):
                raise ValueError("MX hostname must be a valid hostname.")

        elif t == "TXT":
            if len(val) > 4096:
                raise ValueError("TXT record value must be less than 4096 characters.")

        policy = self.routing_policy
        if policy == "Weighted" and self.weight is None:
            raise ValueError("Weight is required when routing policy is 'Weighted'.")
        if policy == "Latency" and not self.region:
            raise ValueError("Region is required when routing policy is 'Latency'.")
        if policy == "Failover" and not self.failover:
            raise ValueError("Failover (PRIMARY/SECONDARY) is required when routing policy is 'Failover'.")

        return self

class DNSRecordUpdate(DNSRecordCreate):
    pass

class DNSRecordResponse(BaseModel):
    id: str
    zone_id: str
    name: str
    type: str
    ttl: int
    value: str
    routing_policy: str
    weight: Optional[int] = None
    region: Optional[str] = None
    failover: Optional[str] = None
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True

# Dashboard Stats Response
class DashboardStats(BaseModel):
    total_zones: int
    total_records: int
    public_zones: int
    private_zones: int
