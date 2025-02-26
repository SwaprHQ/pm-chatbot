CREATE TABLE "Prediction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL,
	"content" json NOT NULL,
	"marketAddress" varchar NOT NULL
);
