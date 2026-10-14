"""add_conversation_attachments

Revision ID: 7d8e9f01ab23
Revises: 9c25187566e8
Create Date: 2026-10-14 22:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '7d8e9f01ab23'
down_revision: Union[str, Sequence[str], None] = '9c25187566e8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'conversation_attachments',
        sa.Column('id', sa.UUID(as_uuid=False), nullable=False),
        sa.Column('conversation_id', sa.UUID(as_uuid=False), nullable=False),
        sa.Column('user_id', sa.UUID(as_uuid=False), nullable=False),
        sa.Column('filename', sa.String(length=255), nullable=False),
        sa.Column('content_type', sa.String(length=100), nullable=False),
        sa.Column('size_bytes', sa.Integer(), nullable=False),
        sa.Column('s3_key', sa.String(length=500), nullable=False),
        sa.Column('extracted_text', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['conversation_id'], ['conversations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_conversation_attachments_conversation_id'), 'conversation_attachments', ['conversation_id'], unique=False)
    op.create_index(op.f('ix_conversation_attachments_user_id'), 'conversation_attachments', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_conversation_attachments_user_id'), table_name='conversation_attachments')
    op.drop_index(op.f('ix_conversation_attachments_conversation_id'), table_name='conversation_attachments')
    op.drop_table('conversation_attachments')
