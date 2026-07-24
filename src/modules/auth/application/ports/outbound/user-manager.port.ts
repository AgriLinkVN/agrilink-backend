export const USER_MANAGER_PORT = Symbol('USER_MANAGER_PORT');

export interface IUserManagerPort {
  findByEmail(email: string): Promise<any>;
  findByFirebaseUid(uid: string): Promise<any>;
  findById(id: string): Promise<any>;
  create(userData: any): Promise<any>;
  updateInternal(id: string, updateData: any): Promise<void>;
}
