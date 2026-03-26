const Database = require('better-sqlite3')
const path = require('path')

const db = new Database(path.join(__dirname, '../db/custom.db'))

try {
  const announcements = db.prepare('SELECT id, title, content, type, priority, isActive, createdAt FROM Announcement ORDER BY createdAt DESC LIMIT 10').all()
  
  console.log('='.repeat(60))
  console.log('ANNOUNCEMENTS CHECK')
  console.log('='.repeat(60))
  console.log('Total announcements found:', announcements.length)
  
  if (announcements.length === 0) {
    console.log('\nNo announcements found in the database!')
    console.log('You need to create some announcements first.')
  } else {
    console.log('\nAnnouncements found:')
    console.log('-'.repeat(60))
    announcements.forEach((a, i) => {
      console.log('\n' + (i + 1) + '. ' + a.title)
      console.log('   Content: ' + a.content.substring(0, 80) + (a.content.length > 80 ? '...' : ''))
      console.log('   Type: ' + a.type)
      console.log('   Priority: ' + a.priority)
      console.log('   Active: ' + (a.isActive ? 'Yes' : 'No'))
      console.log('   Created: ' + new Date(a.createdAt).toLocaleString())
    })
  }
  console.log('='.repeat(60))
} catch (error) {
  console.error('Error:', error)
} finally {
  db.close()
}
