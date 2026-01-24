/**
 * Profiles Store Implementation
 *
 * Data access layer for child profiles using Drizzle ORM.
 */

import 'reflect-metadata';

import { eq } from 'drizzle-orm';
import { inject, injectable } from 'inversify';

import type { DatabaseConnection } from '@mio/shared/server/connections/db';
import { childProfiles } from '@mio/db/schema';

import type { CreateChildProfileInput, IProfilesStore, ProfileRow, UpdateChildProfileInput } from './profiles.service.types';
import { IocConnection } from '../../ioc/ioc.types';

@injectable()
export class ProfilesStore implements IProfilesStore {
  constructor(
    @inject(IocConnection.DATABASE)
    private readonly db: DatabaseConnection
  ) {}

  /**
   * Insert a new profile
   */
  async insert(input: CreateChildProfileInput): Promise<ProfileRow> {
    const result = await this.db
      .insert(childProfiles)
      .values({
        firstName: input.firstName,
        age: input.age,
        gender: input.gender,
        preferences: input.preferences ?? {}
      })
      .returning();

    const row = result[0];
    if (!row) {
      throw new Error('Failed to insert profile');
    }

    return {
      id: row.id,
      firstName: row.firstName,
      age: row.age,
      gender: row.gender,
      preferences: row.preferences ?? {},
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  /**
   * Find a profile by ID
   */
  async findById(id: string): Promise<ProfileRow | null> {
    const [row] = await this.db.select().from(childProfiles).where(eq(childProfiles.id, id)).limit(1);

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      firstName: row.firstName,
      age: row.age,
      gender: row.gender,
      preferences: row.preferences ?? {},
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  /**
   * Find all profiles
   */
  async findAll(): Promise<ProfileRow[]> {
    const rows = await this.db.select().from(childProfiles);

    return rows.map((row) => ({
      id: row.id,
      firstName: row.firstName,
      age: row.age,
      gender: row.gender,
      preferences: row.preferences ?? {},
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }));
  }

  /**
   * Update a profile
   */
  async update(id: string, input: UpdateChildProfileInput): Promise<ProfileRow | null> {
    const updateValues: Partial<typeof childProfiles.$inferInsert> & { updatedAt: Date } = {
      updatedAt: new Date()
    };

    if (input.firstName !== undefined) {
      updateValues.firstName = input.firstName;
    }
    if (input.age !== undefined) {
      updateValues.age = input.age;
    }
    if (input.gender !== undefined) {
      updateValues.gender = input.gender;
    }
    if (input.preferences !== undefined) {
      updateValues.preferences = input.preferences;
    }

    const [row] = await this.db.update(childProfiles).set(updateValues).where(eq(childProfiles.id, id)).returning();

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      firstName: row.firstName,
      age: row.age,
      gender: row.gender,
      preferences: row.preferences ?? {},
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  /**
   * Delete a profile
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.db.delete(childProfiles).where(eq(childProfiles.id, id)).returning({ id: childProfiles.id });

    return result.length > 0;
  }
}
