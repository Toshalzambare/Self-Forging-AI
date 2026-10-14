"""
PostgreSQL-backed async repository for users, sessions, tools, logs, providers, and mcp_servers.
"""
import uuid
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional
from sqlalchemy import select, or_, update
from sqlalchemy.ext.asyncio import AsyncSession
from registry.models import User, UserSession, Tool, ActivityLog, Provider, McpServer


def _hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


class RegistryRepository:
    """Stateless repository — pass db session per method or use get_db() context manager."""

    # ── Users ──────────────────────────────────────────────────────────────────

    @staticmethod
    async def create_user(
        db: AsyncSession,
        *,
        email: str,
        username: str,
        password_hash: Optional[str] = None,
        auth_provider: str = "local",
        google_id: Optional[str] = None,
        avatar_url: Optional[str] = None,
    ) -> User:
        user = User(
            id=str(uuid.uuid4()),
            email=email.strip().lower(),
            username=username.strip(),
            password_hash=password_hash,
            auth_provider=auth_provider,
            google_id=google_id,
            avatar_url=avatar_url,
            is_active=True,
        )
        db.add(user)
        await db.flush()
        return user

    @staticmethod
    async def get_user_by_id(db: AsyncSession, user_id: str) -> Optional[User]:
        result = await db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
        result = await db.execute(select(User).where(User.email == email.strip().lower()))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_user_by_username(db: AsyncSession, username: str) -> Optional[User]:
        result = await db.execute(select(User).where(User.username == username.strip()))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_user_by_login(db: AsyncSession, login: str) -> Optional[User]:
        normalized = login.strip()
        stmt = select(User).where(
            or_(
                User.email == normalized.lower(),
                User.username == normalized
            )
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_user_by_google_id(db: AsyncSession, google_id: str) -> Optional[User]:
        result = await db.execute(select(User).where(User.google_id == google_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def link_google_account(
        db: AsyncSession,
        user: User,
        google_id: str,
        avatar_url: Optional[str] = None,
        clear_unverified_password: bool = True,
    ) -> User:
        user.google_id = google_id
        if avatar_url and not user.avatar_url:
            user.avatar_url = avatar_url
        if clear_unverified_password and user.password_hash:
            # Neutralize pre-account takeover by clearing attacker-set local password
            user.password_hash = None
            user.auth_provider = "google"
        await db.flush()
        return user

    # ── Sessions ───────────────────────────────────────────────────────────────

    @staticmethod
    async def create_session(
        db: AsyncSession,
        *,
        user_id: str,
        refresh_token: str,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None,
        expires_in_days: int = 7,
    ) -> UserSession:
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(days=expires_in_days)
        session = UserSession(
            id=str(uuid.uuid4()),
            user_id=user_id,
            refresh_token_hash=_hash_refresh_token(refresh_token),
            user_agent=user_agent[:500] if user_agent else None,
            ip_address=ip_address[:100] if ip_address else None,
            is_revoked=False,
            expires_at=expires_at,
            created_at=now,
            last_used_at=now,
        )
        db.add(session)
        await db.flush()
        return session

    @staticmethod
    async def get_session_by_token(db: AsyncSession, refresh_token: str) -> Optional[UserSession]:
        token_hash = _hash_refresh_token(refresh_token)
        result = await db.execute(select(UserSession).where(UserSession.refresh_token_hash == token_hash))
        return result.scalar_one_or_none()

    @staticmethod
    async def rotate_session(
        db: AsyncSession,
        old_session: UserSession,
        new_refresh_token: str,
        expires_in_days: int = 7,
    ) -> UserSession:
        # Revoke old session
        old_session.is_revoked = True
        
        # Create new session
        now = datetime.now(timezone.utc)
        new_session = UserSession(
            id=str(uuid.uuid4()),
            user_id=old_session.user_id,
            refresh_token_hash=_hash_refresh_token(new_refresh_token),
            user_agent=old_session.user_agent,
            ip_address=old_session.ip_address,
            is_revoked=False,
            expires_at=now + timedelta(days=expires_in_days),
            created_at=now,
            last_used_at=now,
        )
        db.add(new_session)
        await db.flush()
        return new_session

    @staticmethod
    async def revoke_session(db: AsyncSession, refresh_token: str) -> bool:
        session = await RegistryRepository.get_session_by_token(db, refresh_token)
        if session:
            session.is_revoked = True
            await db.flush()
            return True
        return False

    @staticmethod
    async def revoke_all_user_sessions(db: AsyncSession, user_id: str) -> int:
        stmt = (
            update(UserSession)
            .where(UserSession.user_id == user_id, UserSession.is_revoked == False)
            .values(is_revoked=True)
        )
        result = await db.execute(stmt)
        await db.flush()
        return result.rowcount

    @staticmethod
    async def list_user_sessions(db: AsyncSession, user_id: str) -> list[UserSession]:
        now = datetime.now(timezone.utc)
        stmt = (
            select(UserSession)
            .where(
                UserSession.user_id == user_id,
                UserSession.is_revoked == False,
                UserSession.expires_at > now,
            )
            .order_by(UserSession.last_used_at.desc())
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    # ── Tools ──────────────────────────────────────────────────────────────────

    @staticmethod
    async def add_tool(db: AsyncSession, *, tool_id: str | None = None, name: str,
                       description: str, code: str, schema: dict,
                       tests_code: str = "", user_id: str | None = None,
                       status: str = "active") -> Tool:
        tool = Tool(
            id=tool_id or str(uuid.uuid4()),
            user_id=user_id,
            name=name,
            description=description,
            code=code,
            schema_json=schema if isinstance(schema, dict) else {},
            tests_code=tests_code,
            status=status,
        )
        db.add(tool)
        await db.flush()
        return tool

    @staticmethod
    async def list_tools(db: AsyncSession, user_id: str | None = None) -> list[Tool]:
        stmt = select(Tool).order_by(Tool.created_at.desc())
        if user_id:
            stmt = stmt.where(Tool.user_id == user_id)
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def get_tool(db: AsyncSession, tool_id: str) -> Optional[Tool]:
        result = await db.execute(select(Tool).where(Tool.id == tool_id))
        return result.scalar_one_or_none()

    # ── Logs ───────────────────────────────────────────────────────────────────

    @staticmethod
    async def add_log(db: AsyncSession, *, session_id: str, action: str,
                      details: str, status: str = "success",
                      user_id: str | None = None) -> ActivityLog:
        log = ActivityLog(
            user_id=user_id,
            session_id=session_id,
            action=action,
            details=details,
            status=status,
        )
        db.add(log)
        await db.flush()
        return log

    @staticmethod
    async def list_logs(db: AsyncSession, limit: int = 100,
                        user_id: str | None = None) -> list[ActivityLog]:
        stmt = select(ActivityLog).order_by(ActivityLog.created_at.desc()).limit(limit)
        if user_id:
            stmt = stmt.where(ActivityLog.user_id == user_id)
        result = await db.execute(stmt)
        return list(result.scalars().all())

    # ── Providers ──────────────────────────────────────────────────────────────

    @staticmethod
    async def list_providers(db: AsyncSession, user_id: str | None = None) -> list[Provider]:
        stmt = select(Provider)
        if user_id:
            stmt = stmt.where(or_(Provider.user_id == user_id, Provider.user_id.is_(None)))
        result = await db.execute(stmt)
        return list(result.scalars().all())

    # ── MCP Servers ────────────────────────────────────────────────────────────

    @staticmethod
    async def list_mcp_servers(db: AsyncSession, user_id: str | None = None) -> list[McpServer]:
        stmt = select(McpServer)
        if user_id:
            stmt = stmt.where(or_(McpServer.user_id == user_id, McpServer.user_id.is_(None)))
        result = await db.execute(stmt)
        return list(result.scalars().all())

    # ── Seeding ────────────────────────────────────────────────────────────────

    @staticmethod
    async def seed_defaults(db: AsyncSession) -> None:
        """Seed initial providers and MCP servers if tables are empty."""
        providers_stmt = select(Provider)
        providers_res = await db.execute(providers_stmt)
        if not providers_res.scalars().first():
            default_providers = [
                Provider(id="anthropic", name="Anthropic Claude", description="Default: Claude 3.7 Sonnet (Hybrid Reasoning)", api_key="sk-ant-...", is_active=True),
                Provider(id="openai", name="OpenAI", description="Default: GPT-4o (Vision Analysis)", api_key="sk-proj-...", is_active=True),
                Provider(id="ollama", name="Ollama & Local Hardware", description="Host: DeepSeek-R1-Distill", api_key="", is_active=True),
            ]
            for p in default_providers:
                db.add(p)

        mcp_stmt = select(McpServer)
        mcp_res = await db.execute(mcp_stmt)
        if not mcp_res.scalars().first():
            default_mcps = [
                McpServer(id="fs_mcp", name="Filesystem MCP", url="/Users/local/Projects", status="active"),
                McpServer(id="pg_mcp", name="Postgres Bridge", url="127.0.0.1:5432", status="active"),
                McpServer(id="brave_mcp", name="Brave Search API", url="api.search.brave.com", status="active"),
            ]
            for m in default_mcps:
                db.add(m)

        await db.commit()
