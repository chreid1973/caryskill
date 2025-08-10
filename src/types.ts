// src/types.ts
export type Listing = {
  id: string;
  ownerId: string;
  title: string;
  tags?: string[];
  completed?: boolean;
  // ...other fields
};
