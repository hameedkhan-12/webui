
export enum CollaboratorRole {
  VIEWER = 'VIEWER',   // read-only
  EDITOR = 'EDITOR',   // can edit canvas and content
  ADMIN  = 'ADMIN',    // can manage collaborators
}

export interface Collaborator {
  id:        string;
  projectId: string;
  userId:    string;
  role:      CollaboratorRole;
  // Joined from User
  name:      string | null;
  email:     string;
  avatar:    string | null;
  joinedAt:  Date;
}

export interface AddCollaboratorDto {
  email: string;              
  role:  CollaboratorRole;
}

export interface UpdateCollaboratorRoleDto {
  role: CollaboratorRole;
}

export interface Comment {
  id:        string;
  projectId: string;
  authorId:  string;
  // Joined from User
  authorName:   string | null;
  authorAvatar: string | null;
  content:      string;
  // Optional: pin comment to a canvas element
  elementId?:   string;
  // Thread support — null means it's a top-level comment
  parentId?:    string;
  replies?:     Comment[];
  resolved:     boolean;
  createdAt:    Date;
  updatedAt:    Date;
}

export interface CreateCommentDto {
  content:   string;
  elementId?: string;   // pin to canvas element (optional)
  parentId?:  string;   // reply to comment (optional)
}