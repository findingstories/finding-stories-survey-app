import type { QuestionType, Role } from "@/generated/prisma/enums";

export { QuestionType, Role };

// Explicit model types (mirrors Prisma schema)
export type Question = {
  id: string;
  questionnaireId: string;
  type: QuestionType;
  text: string;
  instructions: string | null;
  required: boolean;
  order: number;
  options: unknown;
  config: unknown;
};

export type Questionnaire = {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  isOpen: boolean;
  completionMessage: string | null;
  showFillAgain: boolean;
  alertEmails: unknown;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Response = {
  id: string;
  questionnaireId: string;
  submittedAt: Date;
};

export type Answer = {
  id: string;
  responseId: string;
  questionId: string;
  textValue: string | null;
  selectedOptions: unknown;
  numericValue: number | null;
};

export type User = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  createdAt: Date;
};

export type Invitation = {
  id: string;
  email: string;
  token: string;
  invitedById: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  createdAt: Date;
};
