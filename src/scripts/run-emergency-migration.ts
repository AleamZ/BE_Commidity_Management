import { MongoClient } from 'mongodb';

// Emergency migration script
async function runEmergencyMigration() {
    const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';

    console.log('🚨 EMERGENCY MIGRATION: Fixing name unique index');
    console.log(`Connecting to: ${mongoUrl}`);

    const client = new MongoClient(mongoUrl);

    try {
        await client.connect();
        console.log('✅ Connected to MongoDB');

        const db = client.db();
        const collection = db.collection('products');

        // 1. List current indexes
        console.log('\n1. Current indexes:');
        const indexes = await collection.listIndexes().toArray();
        indexes.forEach(index => {
            if (index.name?.includes('name')) {
                console.log(`- ${index.name}: ${JSON.stringify(index.key)} (unique: ${index.unique || false})`);
            }
        });

        // 2. Drop name unique index
        let droppedSuccessfully = false;

        // Try approach 1: Drop by name
        try {
            await collection.dropIndex('name_1');
            console.log('\n✅ Dropped index by name "name_1"');
            droppedSuccessfully = true;
        } catch (error) {
            console.log(`\n❌ Approach 1 failed: ${error.message}`);
        }

        // Try approach 2: Drop by specification
        if (!droppedSuccessfully) {
            try {
                await collection.dropIndex({ name: 1 } as any);
                console.log('✅ Dropped index by specification { name: 1 }');
                droppedSuccessfully = true;
            } catch (error: any) {
                console.log(`❌ Approach 2 failed: ${error.message}`);
            }
        }

        // Try approach 3: Nuclear option
        if (!droppedSuccessfully) {
            console.log('\n⚠️  Using nuclear option: dropping all non-_id indexes...');
            try {
                const allIndexes = await collection.listIndexes().toArray();
                for (const index of allIndexes) {
                    if (index.name !== '_id_') {
                        try {
                            await collection.dropIndex(index.name);
                            console.log(`Dropped: ${index.name}`);
                        } catch (error) {
                            console.log(`Failed to drop ${index.name}: ${error.message}`);
                        }
                    }
                }
                droppedSuccessfully = true;
                console.log('✅ All non-_id indexes dropped');
            } catch (error) {
                console.log(`❌ Nuclear option failed: ${error.message}`);
            }
        }

        // 3. Create new indexes
        if (droppedSuccessfully) {
            console.log('\n3. Creating new indexes...');

            try {
                // Non-unique name index
                await collection.createIndex(
                    { name: 1 },
                    { background: true, name: 'name_1_non_unique' }
                );
                console.log('✅ Created non-unique name index');
            } catch (error) {
                console.log(`❌ Failed to create name index: ${error.message}`);
            }

            try {
                // Barcode partial unique index
                await collection.createIndex(
                    { barcode: 1, isDelete: 1 },
                    {
                        unique: true,
                        partialFilterExpression: { isDelete: false },
                        background: true,
                        name: 'barcode_active_unique'
                    }
                );
                console.log('✅ Created barcode partial unique index');
            } catch (error) {
                console.log(`❌ Failed to create barcode index: ${error.message}`);
            }

            try {
                // Performance indexes
                await collection.createIndex({ barcode: 1 }, { background: true, name: 'barcode_1_new' });
                await collection.createIndex({ isDelete: 1 }, { background: true, name: 'isDelete_1_new' });
                console.log('✅ Created performance indexes');
            } catch (error) {
                console.log(`❌ Failed to create performance indexes: ${error.message}`);
            }
        }

        // 4. Verify final state
        console.log('\n4. Final indexes:');
        const finalIndexes = await collection.listIndexes().toArray();
        finalIndexes.forEach(index => {
            console.log(`- ${index.name}: ${JSON.stringify(index.key)}`);
            if (index.unique) {
                console.log(`  Unique: true${index.partialFilterExpression ? ', Partial: yes' : ''}`);
            }
        });

        // 5. Test duplicate names
        console.log('\n5. Testing duplicate names...');
        const testName = `Emergency Test ${Date.now()}`;
        try {
            await collection.insertOne({
                name: testName,
                barcode: 'EMERGENCY_001',
                brandId: '507f1f77bcf86cd799439011',
                categoryId: '507f1f77bcf86cd799439011',
                isDelete: false
            });

            await collection.insertOne({
                name: testName, // Same name
                barcode: 'EMERGENCY_002', // Different barcode
                brandId: '507f1f77bcf86cd799439011',
                categoryId: '507f1f77bcf86cd799439011',
                isDelete: false
            });

            console.log('✅ Successfully created two products with same name!');

            // Clean up
            await collection.deleteMany({ barcode: { $in: ['EMERGENCY_001', 'EMERGENCY_002'] } });
            console.log('✅ Cleaned up test data');

        } catch (error) {
            console.log(`❌ Test failed: ${error.message}`);
            // Clean up partial data
            await collection.deleteMany({ barcode: { $in: ['EMERGENCY_001', 'EMERGENCY_002'] } });
        }

        console.log('\n🎉 EMERGENCY MIGRATION COMPLETED!');
        console.log('You can now create products with duplicate names!');

    } catch (error) {
        console.error('🚨 Emergency migration failed:', error);
        process.exit(1);
    } finally {
        await client.close();
    }
}

// Run if called directly
if (require.main === module) {
    runEmergencyMigration()
        .then(() => {
            console.log('Migration completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
}

export default runEmergencyMigration; 