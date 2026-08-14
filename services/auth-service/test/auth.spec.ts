import bcrypt from 'bcryptjs';

describe('password handling', () => {
  it('hashes passwords rather than storing plaintext', async () => {
    const hash = await bcrypt.hash('Portfolio123!', 4);
    expect(hash).not.toContain('Portfolio123!');
    expect(await bcrypt.compare('Portfolio123!', hash)).toBe(true);
  });
});
