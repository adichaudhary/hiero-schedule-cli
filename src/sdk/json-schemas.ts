/**
 * JSON Schema exports for all hiero-schedule input and output types.
 *
 * Provides draft-07 JSON Schemas derived from the Zod schemas used by each
 * command.  Useful for:
 *   - Validating external payloads before passing them to the CLI
 *   - Generating OpenAPI specs
 *   - Editor autocompletion via $schema references
 *
 * The converter is a purposeful subset of zod-to-json-schema that handles
 * the Zod types actually used in this codebase.
 */

import type { ZodTypeAny, ZodObject, ZodRawShape } from 'zod';
import { z } from 'zod';

// ── Lightweight Zod → JSON Schema converter ────────────────────────────────────

type JsonSchemaType =
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'array'
  | 'object'
  | 'null';

export interface JsonSchema {
  $schema?: string;
  type?: JsonSchemaType | JsonSchemaType[];
  title?: string;
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  default?: unknown;
  additionalProperties?: boolean;
  anyOf?: JsonSchema[];
}

/** Converts a Zod schema to a draft-07 compatible JSON Schema object. */
export function zodToJsonSchema(schema: ZodTypeAny, title?: string): JsonSchema {
  const result = convertZod(schema);
  if (title) result.title = title;
  result.$schema = 'http://json-schema.org/draft-07/schema#';
  return result;
}

function convertZod(schema: ZodTypeAny): JsonSchema {
  // Unwrap ZodDefault
  if (schema._def.typeName === 'ZodDefault') {
    const inner = convertZod(schema._def.innerType as ZodTypeAny);
    inner.default = schema._def.defaultValue();
    return inner;
  }

  // Unwrap ZodOptional
  if (schema._def.typeName === 'ZodOptional') {
    const inner = convertZod(schema._def.innerType as ZodTypeAny);
    return inner;
  }

  // ZodString
  if (schema._def.typeName === 'ZodString') {
    const result: JsonSchema = { type: 'string' };
    const checks: Array<{ kind: string; value?: unknown; regex?: RegExp }> =
      (schema._def.checks as Array<{ kind: string; value?: unknown; regex?: RegExp }>) ?? [];
    for (const check of checks) {
      if (check.kind === 'min') result.minLength = check.value as number;
      if (check.kind === 'max') result.maxLength = check.value as number;
      if (check.kind === 'regex') result.pattern = (check.regex as RegExp).source;
      if (check.kind === 'url') (result as Record<string, unknown>)['format'] = 'uri';
    }
    return result;
  }

  // ZodNumber
  if (schema._def.typeName === 'ZodNumber') {
    const checks: Array<{ kind: string; value?: number; inclusive?: boolean }> =
      (schema._def.checks as Array<{ kind: string; value?: number; inclusive?: boolean }>) ?? [];
    let isInt = false;
    const result: JsonSchema = { type: 'number' };
    for (const check of checks) {
      if (check.kind === 'int') isInt = true;
      if (check.kind === 'min') result.minimum = check.value;
      if (check.kind === 'max') result.maximum = check.value;
    }
    if (isInt) result.type = 'integer';
    return result;
  }

  // ZodBoolean
  if (schema._def.typeName === 'ZodBoolean') {
    return { type: 'boolean' };
  }

  // ZodEnum
  if (schema._def.typeName === 'ZodEnum') {
    return { type: 'string', enum: schema._def.values as string[] };
  }

  // ZodArray
  if (schema._def.typeName === 'ZodArray') {
    return {
      type: 'array',
      items: convertZod(schema._def.type as ZodTypeAny),
    };
  }

  // ZodObject
  if (schema._def.typeName === 'ZodObject') {
    const shape = (schema as ZodObject<ZodRawShape>).shape;
    const properties: Record<string, JsonSchema> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      properties[key] = convertZod(value as ZodTypeAny);
      // A field is required if it's not ZodOptional and not ZodDefault
      const typeName = (value as ZodTypeAny)._def.typeName;
      if (typeName !== 'ZodOptional' && typeName !== 'ZodDefault') {
        required.push(key);
      }
    }

    const result: JsonSchema = {
      type: 'object',
      properties,
      additionalProperties: false,
    };
    if (required.length > 0) result.required = required;
    return result;
  }

  // Fallback — unknown type
  return {};
}

// ── Import all schemas ─────────────────────────────────────────────────────────

import { CreateInputSchema, CreateOutputSchema } from '../plugins/schedule/commands/create';
import { SignInputSchema, SignOutputSchema } from '../plugins/schedule/commands/sign';
import { CosignInputSchema, CosignOutputSchema } from '../plugins/schedule/commands/cosign';
import { SignersInputSchema, SignersOutputSchema } from '../plugins/schedule/commands/signers';
import { StatusInputSchema } from '../plugins/schedule/commands/status/input';
import { StatusOutputSchema } from '../plugins/schedule/commands/status/output';
import { WatchInputSchema } from '../plugins/schedule/commands/watch/input';
import { WatchOutputSchema } from '../plugins/schedule/commands/watch/output';
import { RecurringInputSchema, RecurringOutputSchema } from '../plugins/schedule/commands/recurring';
import { ListInputSchema, ListOutputSchema } from '../plugins/schedule/commands/list';

// Re-export Zod schemas for consumers who want to do their own conversion
export {
  CreateInputSchema,
  CreateOutputSchema,
  SignInputSchema,
  SignOutputSchema,
  CosignInputSchema,
  CosignOutputSchema,
  SignersInputSchema,
  SignersOutputSchema,
  StatusInputSchema,
  StatusOutputSchema,
  WatchInputSchema,
  WatchOutputSchema,
  RecurringInputSchema,
  RecurringOutputSchema,
  ListInputSchema,
  ListOutputSchema,
};

// ── Pre-built JSON Schema objects ──────────────────────────────────────────────

export const schemas = {
  'schedule:create': {
    input: zodToJsonSchema(CreateInputSchema, 'ScheduleCreateInput'),
    output: zodToJsonSchema(CreateOutputSchema, 'ScheduleCreateOutput'),
  },
  'schedule:sign': {
    input: zodToJsonSchema(SignInputSchema, 'ScheduleSignInput'),
    output: zodToJsonSchema(SignOutputSchema, 'ScheduleSignOutput'),
  },
  'schedule:cosign': {
    input: zodToJsonSchema(CosignInputSchema, 'ScheduleCosignInput'),
    output: zodToJsonSchema(CosignOutputSchema, 'ScheduleCosignOutput'),
  },
  'schedule:signers': {
    input: zodToJsonSchema(SignersInputSchema, 'ScheduleSignersInput'),
    output: zodToJsonSchema(SignersOutputSchema, 'ScheduleSignersOutput'),
  },
  'schedule:status': {
    input: zodToJsonSchema(StatusInputSchema, 'ScheduleStatusInput'),
    output: zodToJsonSchema(StatusOutputSchema, 'ScheduleStatusOutput'),
  },
  'schedule:watch': {
    input: zodToJsonSchema(WatchInputSchema, 'ScheduleWatchInput'),
    output: zodToJsonSchema(WatchOutputSchema, 'ScheduleWatchOutput'),
  },
  'schedule:recurring': {
    input: zodToJsonSchema(RecurringInputSchema, 'ScheduleRecurringInput'),
    output: zodToJsonSchema(RecurringOutputSchema, 'ScheduleRecurringOutput'),
  },
  'schedule:list': {
    input: zodToJsonSchema(ListInputSchema, 'ScheduleListInput'),
    output: zodToJsonSchema(ListOutputSchema, 'ScheduleListOutput'),
  },
} as const;
