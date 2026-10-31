import { parseWhatsNew, shouldShowWhatsNew } from './whats-new';
import { assertEqual, test } from './test-support';

test('a notice needs an id, a title, and at least one bullet', () => {
  assertEqual(parseWhatsNew({ id: 'a', title: 'New', bullets: ['One'] }), { bullets: ['One'], id: 'a', title: 'New' });
  assertEqual(parseWhatsNew({ id: '', title: 'New', bullets: ['One'] }), null);
  assertEqual(parseWhatsNew({ id: 'a', title: '', bullets: ['One'] }), null);
  assertEqual(parseWhatsNew({ id: 'a', title: 'New', bullets: [] }), null);
  assertEqual(parseWhatsNew({ id: 'a', title: 'New', bullets: ['', '  '] }), null);
});

test('a new id shows until that id is dismissed', () => {
  const notice = { bullets: ['Backup'], id: '1.6.0-backup', title: "What's new" };
  assertEqual(shouldShowWhatsNew(notice, ''), true);
  assertEqual(shouldShowWhatsNew(notice, '1.6.0-backup'), false);
  assertEqual(shouldShowWhatsNew(notice, 'older'), true);
});
