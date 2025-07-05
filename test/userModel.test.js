import { strict as assert } from 'assert';
import { Customer, Admin } from '../models/User.js';

describe('User / Admin Inheritance', () => {
  it('Customer should not be admin', () => {
    const customer = new Customer('Customer1', 'customer@aol.com');
    assert.equal(customer.isAdmin(), false);
  });

  it('Admin should be admin', () => {
    const admin = new Admin(1, 'Admin1', 'admin@example.com', ['READ_ALL']);
    assert.equal(admin.isAdmin(), true);
    assert.equal(admin.permissions.length, 1);
    assert.equal(admin.permissions[0], 'READ_ALL');
  });
});