import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { getSetting, setSetting } from '../src/lib/settings';
import { sqlite } from '../src/db/index';
const key='qa-settings-'+randomUUID();
try {setSetting(key,'');assert.equal(getSetting(key),'');setSetting(key,'first');assert.equal(getSetting(key),'first');setSetting(key,'');assert.equal(getSetting(key),'');setSetting(key,'second');assert.equal(getSetting(key),'second');console.log('PASS: 4 settings save/clear/save checks');}
finally {sqlite.prepare('DELETE FROM app_settings WHERE key=?').run(key);}
