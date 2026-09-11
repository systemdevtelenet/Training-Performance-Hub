const { isTrainerMatch, TRAINER_NAME_MAP } = require('../lib/analytics-utils');

const namesToTest = [
  'Bianca Kaye Ernestine Colonia',
  'Bianca',
  'bcolonia@cebutelenet.com',
  'Bianca Colonia',
  'TR Bianca',
  'Bianca Kaye'
];

const assignedInDB = 'TR BIANCA';

namesToTest.forEach(n => {
  console.log(`isTrainerMatch('${assignedInDB}', '${n}') =>`, isTrainerMatch(assignedInDB, n));
});
