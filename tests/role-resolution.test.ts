import assert from 'node:assert/strict';
import { canAccessTrainingHub, resolveSystemRole } from '../lib/auth/role-resolution';
import { isTrainerEmployee } from '../lib/trainer-position';

assert.equal(resolveSystemRole('Admin', 'Customer Service Associate', 'CSA'), 'SUPER_ADMIN');
assert.equal(resolveSystemRole('Agent', 'Head Of Training', 'HOT'), 'HOT_ADMIN');
assert.equal(resolveSystemRole('QA', 'QA Supervisor', 'QAS'), 'QAS_ADMIN');
assert.equal(resolveSystemRole('Trainer', 'Customer Service Associate', 'CSA'), 'TRAINER');
assert.equal(resolveSystemRole('Agent', 'Corporate Trainer', 'CORP-TR'), 'TRAINER');
assert.equal(resolveSystemRole('QA', 'Quality Analyst', 'QA'), 'UNAUTHORIZED');
assert.equal(resolveSystemRole('Agent', 'Customer Service Associate', 'CSA'), 'UNAUTHORIZED');
assert.equal(resolveSystemRole('VIEW_ADMIN', 'Customer Service Associate', 'CSA'), 'UNAUTHORIZED');
assert.equal(isTrainerEmployee({ position_id: 99, position_code: 'OTHER' }, 'Trainer'), true);
assert.equal(isTrainerEmployee({ position_id: 99, position_code: 'CORP-TR' }, 'Agent'), true);
assert.equal(isTrainerEmployee({ position_id: 99, position_code: 'CORP-TR' }, 'QA'), false);

for (const allowedRole of ['SUPER_ADMIN', 'HOT_ADMIN', 'QAS_ADMIN', 'TRAINER']) {
  assert.equal(canAccessTrainingHub(allowedRole), true, `${allowedRole} should access the hub`);
}
for (const deniedRole of ['EMPLOYEE', 'TRAINEE', 'VIEW_ADMIN', 'UNAUTHORIZED', 'GUEST']) {
  assert.equal(canAccessTrainingHub(deniedRole), false, `${deniedRole} should be blocked`);
}

console.log('role resolution cases passed');
