CREATE TABLE "notion_oauth_clients" (
	"issuer" text NOT NULL,
	"redirect_uri" text NOT NULL,
	"client_id" text NOT NULL,
	"client_secret_encrypted" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notion_oauth_clients_issuer_redirect_uri_pk" PRIMARY KEY("issuer","redirect_uri")
);
--> statement-breakpoint
ALTER TABLE "notion_connections" ALTER COLUMN "access_token_encrypted" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "saved_to_notion" ALTER COLUMN "notion_page_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "notion_connections" ADD COLUMN "issuer" text;--> statement-breakpoint
ALTER TABLE "notion_connections" ADD COLUMN "refresh_locked_until" timestamp with time zone;