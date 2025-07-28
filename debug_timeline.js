// Debug script to check Timeline data
console.log('🔍 DEBUGGING TIMELINE DATA...');

// Check if running in browser with IndexedDB
if (typeof indexedDB !== 'undefined') {
  
  // Function to check IndexedDB contents
  async function checkIndexedDB() {
    try {
      console.log('📊 Opening ChimueloHealthTracker database...');
      
      const request = indexedDB.open('ChimueloHealthTracker', 1);
      
      request.onsuccess = function(event) {
        const db = event.target.result;
        console.log('✅ Database opened successfully');
        console.log('📋 Object stores:', Array.from(db.objectStoreNames));
        
        // Check health records
        const transaction = db.transaction(['health_records'], 'readonly');
        const store = transaction.objectStore('health_records');
        const countRequest = store.count();
        
        countRequest.onsuccess = function() {
          console.log(`📊 Total health records: ${countRequest.result}`);
          
          if (countRequest.result > 0) {
            // Get all records
            const getAllRequest = store.getAll();
            getAllRequest.onsuccess = function() {
              console.log('📝 All health records:', getAllRequest.result);
              getAllRequest.result.forEach((record, index) => {
                console.log(`Record ${index + 1}:`, {
                  id: record.id,
                  type: record.type,
                  timestamp: record.timestamp,
                  userId: record.userId
                });
              });
            };
          } else {
            console.log('❌ No health records found in database');
          }
        };
        
        countRequest.onerror = function() {
          console.error('❌ Error counting records:', countRequest.error);
        };
      };
      
      request.onerror = function(event) {
        console.error('❌ Error opening database:', event.target.error);
      };
      
    } catch (error) {
      console.error('❌ Error checking IndexedDB:', error);
    }
  }
  
  // Run the check
  checkIndexedDB();
  
} else {
  console.log('❌ IndexedDB not available (not in browser)');
}
