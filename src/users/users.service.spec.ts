import { UsersService } from './users.service';

function mockUserRepo(user: any) {
  return {
    findOne: jest.fn().mockResolvedValue(user),
    create: jest.fn((x: unknown) => x),
    save: jest.fn((x: unknown) => Promise.resolve(x)),
    remove: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
  };
}

function mockRolesRepo() {
  return {
    findOne: jest.fn().mockResolvedValue({
      id: 'role-1',
      name: 'customer',
      level: 10,
      grantsAll: false,
    }),
  };
}

function mockCloudinary() {
  return {
    uploadImage: jest.fn().mockResolvedValue({
      url: 'https://img/u.jpg',
      publicId: 'al-ucaaz/avatars/u',
    }),
    deleteImage: jest.fn().mockResolvedValue(undefined),
  };
}

function mockAudit() {
  return { log: jest.fn().mockResolvedValue(undefined) };
}

function baseUser() {
  return {
    id: 'user-1',
    name: 'Ali',
    email: 'ali@x.com',
    phone: null,
    avatarUrl: null,
    avatarPublicId: null,
    emailVerified: true,
    isActive: true,
    role: { id: 'role-1', name: 'customer', level: 10 },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

const fakeFile = {
  buffer: Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  ]),
} as Express.Multer.File;
const actor = {
  id: 'admin-1',
  email: 'a@x.com',
  role: 'super_admin',
  roleId: 'r0',
  level: 100,
  grantsAll: true,
  permissions: [],
};

function makeService(user: any) {
  const users = mockUserRepo(user);
  const cloudinary = mockCloudinary();
  const audit = mockAudit();
  const svc = new UsersService(
    users as never,
    mockRolesRepo() as never,
    cloudinary as never,
    audit as never,
  );
  return { svc, users, cloudinary, audit };
}

describe('UsersService — avatar flow', () => {
  it('updateProfile: avatar file ho to upload + purani delete, data bhi update', async () => {
    const user = { ...baseUser(), avatarPublicId: 'al-ucaaz/avatars/old' };
    const { svc, cloudinary } = makeService(user);

    const out = await svc.updateProfile(
      'user-1',
      { name: 'Ali Raza' },
      fakeFile,
    );

    expect(cloudinary.uploadImage).toHaveBeenCalledWith(
      fakeFile.buffer,
      expect.objectContaining({ folder: 'al-ucaaz/avatars' }),
    );
    expect(cloudinary.deleteImage).toHaveBeenCalledWith('al-ucaaz/avatars/old');
    expect(out.avatarUrl).toBe('https://img/u.jpg');
    expect(out.name).toBe('Ali Raza');
  });

  it('updateProfile: avatar na ho to upload nahi hota, sirf data update', async () => {
    const { svc, cloudinary } = makeService(baseUser());

    const out = await svc.updateProfile('user-1', { name: 'No Pic' });

    expect(cloudinary.uploadImage).not.toHaveBeenCalled();
    expect(cloudinary.deleteImage).not.toHaveBeenCalled();
    expect(out.avatarUrl).toBeNull();
    expect(out.name).toBe('No Pic');
  });

  it('createByAdmin: picture OPTIONAL — na ho to bhi user ban jata hai', async () => {
    const { svc, cloudinary } = makeService(null);

    const out = await svc.createByAdmin(
      {
        name: 'New',
        email: 'new@x.com',
        password: 'StrongPass123',
        roleId: 'role-1',
      },
      actor,
    );

    expect(cloudinary.uploadImage).not.toHaveBeenCalled();
    expect(out.email).toBe('new@x.com');
  });

  it('createByAdmin: picture ho to sath lag jati hai', async () => {
    const { svc, cloudinary } = makeService(null);

    const out = await svc.createByAdmin(
      {
        name: 'New',
        email: 'new@x.com',
        password: 'StrongPass123',
        roleId: 'role-1',
      },
      actor,
      fakeFile,
    );

    expect(cloudinary.uploadImage).toHaveBeenCalled();
    expect(out.avatarUrl).toBe('https://img/u.jpg');
  });

  it('deleteUser: Cloudinary avatar bhi saaf hoti hai (orphan nahi)', async () => {
    const user = { ...baseUser(), avatarPublicId: 'al-ucaaz/avatars/u' };
    const { svc, users, cloudinary } = makeService(user);

    await svc.deleteUser('user-1', actor);

    expect(cloudinary.deleteImage).toHaveBeenCalledWith('al-ucaaz/avatars/u');
    expect(users.remove).toHaveBeenCalledWith(user);
  });

  it('deleteUser: avatar na ho to deleteImage call nahi hota', async () => {
    const { svc, users, cloudinary } = makeService(baseUser());

    await svc.deleteUser('user-1', actor);

    expect(cloudinary.deleteImage).not.toHaveBeenCalled();
    expect(users.remove).toHaveBeenCalled();
  });
});

describe('UsersService — audit trail', () => {
  it('createByAdmin: users.create log hota hai', async () => {
    const { svc, audit } = makeService(null);
    await svc.createByAdmin(
      {
        name: 'New',
        email: 'new@x.com',
        password: 'StrongPass123',
        roleId: 'role-1',
      },
      actor,
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'admin-1',
        action: 'users.create',
        targetType: 'user',
      }),
    );
  });

  it('deleteUser: users.delete log hota hai', async () => {
    const { svc, audit } = makeService(baseUser());
    await svc.deleteUser('user-1', actor);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'users.delete', targetId: 'user-1' }),
    );
  });

  it('setActive: users.set-active log hota hai', async () => {
    const { svc, audit } = makeService(baseUser());
    await svc.setActive('user-1', false, actor);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'users.set-active',
        details: expect.objectContaining({ isActive: false }),
      }),
    );
  });
});
