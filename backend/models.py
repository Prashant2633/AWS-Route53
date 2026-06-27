import uuid
from sqlalchemy import Column, String, Integer, ForeignKey, text
from sqlalchemy.orm import relationship
from database import Base

def generate_uuid():
    return uuid.uuid4().hex

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid, server_default=text("(lower(hex(randomblob(16))))"))
    username = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(String, default=text("(datetime('now'))"), server_default=text("(datetime('now'))"))


class HostedZone(Base):
    __tablename__ = "hosted_zones"

    id = Column(String, primary_key=True, default=generate_uuid, server_default=text("(lower(hex(randomblob(16))))"))
    name = Column(String, unique=True, nullable=False)
    type = Column(String, nullable=False)  # "Public" | "Private"
    comment = Column(String, nullable=True)
    record_count = Column(Integer, default=0, server_default=text("0"))
    created_at = Column(String, default=text("(datetime('now'))"), server_default=text("(datetime('now'))"))

    # Relationship to records with cascade delete
    records = relationship("DNSRecord", back_populates="zone", cascade="all, delete-orphan")


class DNSRecord(Base):
    __tablename__ = "dns_records"

    id = Column(String, primary_key=True, default=generate_uuid, server_default=text("(lower(hex(randomblob(16))))"))
    zone_id = Column(String, ForeignKey("hosted_zones.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # A|AAAA|CNAME|TXT|MX|NS|PTR|SRV|CAA
    ttl = Column(Integer, default=300, server_default=text("300"))
    value = Column(String, nullable=False)
    routing_policy = Column(String, default="Simple", server_default=text("'Simple'"))  # Simple|Weighted|Latency|Failover
    weight = Column(Integer, nullable=True)
    region = Column(String, nullable=True)
    failover = Column(String, nullable=True)  # PRIMARY | SECONDARY
    created_at = Column(String, default=text("(datetime('now'))"), server_default=text("(datetime('now'))"))
    updated_at = Column(String, default=text("(datetime('now'))"), server_default=text("(datetime('now'))"), onupdate=text("(datetime('now'))"))

    # Relationship back to hosted zone
    zone = relationship("HostedZone", back_populates="records")
