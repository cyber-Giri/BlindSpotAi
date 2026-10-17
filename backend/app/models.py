import uuid
from datetime import datetime
from sqlalchemy import (
    Column,
    String,
    Text,
    Integer,
    Float,
    Boolean,
    ForeignKey,
    DateTime,
    JSON,
)
from sqlalchemy.orm import relationship
from app.database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    analyses = relationship("Analysis", back_populates="project", cascade="all, delete-orphan")
    findings = relationship("Finding", back_populates="project", cascade="all, delete-orphan")
    assumptions = relationship("Assumption", back_populates="project", cascade="all, delete-orphan")
    recommendations = relationship("Recommendation", back_populates="project", cascade="all, delete-orphan")
    scenarios = relationship("Scenario", back_populates="project", cascade="all, delete-orphan")


class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    analysis_type = Column(String(50), default="documents")  # documents, dataset, workflow
    depth = Column(String(50), default="Standard")  # Quick, Standard, Comprehensive
    areas_of_concern = Column(JSON, default=list)
    risk_sensitivity = Column(String(50), default="Balanced")
    source_files = Column(JSON, default=list)  # list of filenames and metadata
    raw_summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="analyses")


class Finding(Base):
    __tablename__ = "findings"

    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(100), nullable=False)
    severity = Column(String(50), nullable=False)  # Critical, High, Medium, Low
    likelihood = Column(Integer, default=3)  # 1-5
    impact = Column(Integer, default=5)  # 1-10
    risk_score = Column(Integer, default=15)  # likelihood * impact (or scaled)
    confidence = Column(Integer, default=70)  # 0-100
    evidence = Column(String(50), default="Available")  # Available, Partial, None
    recommendation = Column(Text, nullable=True)
    status = Column(String(50), default="Open")  # Open, Investigating, Accepted, Resolved
    detected_at = Column(DateTime, default=datetime.utcnow)
    owner = Column(String(100), nullable=True)
    overlooked = Column(Text, nullable=True)
    why_matters = Column(Text, nullable=True)
    evidence_items = Column(JSON, default=list)  # [{source, passage, origin}]
    assumption_ids = Column(JSON, default=list)
    consequences = Column(JSON, default=list)
    verification_test = Column(Text, nullable=True)
    uncertainty = Column(Text, nullable=True)
    node_ids = Column(JSON, default=list)
    comments = Column(JSON, default=list)  # [{id, author, text, at}]
    is_demo = Column(Boolean, default=False)

    project = relationship("Project", back_populates="findings")


class Assumption(Base):
    __tablename__ = "assumptions"

    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    text = Column(Text, nullable=False)
    category = Column(String(100), default="Technical")
    evidence = Column(JSON, default=list)
    confidence = Column(Integer, default=70)
    status = Column(String(50), default="Unverified")  # Unverified, Partially Verified, Verified, Disproven, Accepted Risk
    risk_if_false = Column(String(50), default="High")  # Critical, High, Medium, Low
    owner = Column(String(100), default="Unassigned")
    due_date = Column(String(50), nullable=True)
    finding_ids = Column(JSON, default=list)
    history = Column(JSON, default=list)  # [{status, at, note}]
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("Project", back_populates="assumptions")


class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    finding_id = Column(String, nullable=True)
    action = Column(Text, nullable=False)
    rationale = Column(Text, nullable=True)
    evidence = Column(Text, nullable=True)
    benefit = Column(Text, nullable=True)
    effort = Column(String(50), default="Medium")  # Low, Medium, High
    priority = Column(Integer, default=1)
    dependencies = Column(JSON, default=list)
    verification = Column(Text, nullable=True)
    status = Column(String(50), default="Not Started")  # Not Started, Planned, In Progress, Completed
    owner = Column(String(100), nullable=True)
    due_date = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="recommendations")


class Scenario(Base):
    __tablename__ = "scenarios"

    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    inputs = Column(JSON, nullable=False)
    result = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="scenarios")
