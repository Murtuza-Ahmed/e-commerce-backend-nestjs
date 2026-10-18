import { AuditService } from './audit.service';

function mockRepo(rows: any[] = []) {
  const qb: any = {
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([rows, rows.length]),
  };
  return {
    create: jest.fn((x: unknown) => x),
    save: jest.fn((x: unknown) => Promise.resolve(x)),
    createQueryBuilder: jest.fn().mockReturnValue(qb),
    _qb: qb,
  };
}

describe('AuditService', () => {
  it('log(): entry save hoti hai', async () => {
    const repo = mockRepo();
    const svc = new AuditService(repo as never);
    await svc.log({
      actorId: 'a1',
      actorEmail: 'a@x.com',
      action: 'users.delete',
      targetType: 'user',
      targetId: 'u1',
      details: { email: 'u@x.com' },
    });
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'users.delete', targetId: 'u1' }),
    );
  });

  it('log(): DB fail ho to throw nahi karta (action nahi rukta)', async () => {
    const repo = mockRepo();
    repo.save.mockRejectedValue(new Error('db down'));
    const svc = new AuditService(repo as never);
    await expect(
      svc.log({ action: 'users.delete', targetType: 'user' }),
    ).resolves.toBeUndefined();
  });

  it('list(): pagination + filters', async () => {
    const rows = [{ id: '1', action: 'users.delete' }];
    const repo = mockRepo(rows);
    const svc = new AuditService(repo as never);
    const out = await svc.list(2, 10, { action: 'users.delete' });
    expect(out).toEqual({ data: rows, total: 1, page: 2, limit: 10 });
    expect(repo._qb.andWhere).toHaveBeenCalledWith(
      'a.action = :action',
      expect.objectContaining({ action: 'users.delete' }),
    );
  });
});
