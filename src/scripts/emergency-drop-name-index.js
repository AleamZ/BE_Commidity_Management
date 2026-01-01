// Emergency script để drop name unique index
// Chạy script này nếu migration service không drop được index

// Connect to your MongoDB database
// use your_database_name

print("=== EMERGENCY: Dropping name unique index ===");

// 1. List current indexes to see what we're dealing with
print("\n1. Current indexes before dropping:");
db.products.getIndexes().forEach(function (index) {
    if (index.name.includes('name')) {
        print(`- ${index.name}: ${JSON.stringify(index.key)} (unique: ${index.unique || false})`);
    }
});

// 2. Try multiple approaches to drop name index
var droppedSuccessfully = false;

// Approach 1: Drop by name
try {
    db.products.dropIndex("name_1");
    print("\n✅ Approach 1: Successfully dropped index by name 'name_1'");
    droppedSuccessfully = true;
} catch (e) {
    print(`\n❌ Approach 1 failed: ${e.message}`);
}

// Approach 2: Drop by index specification
if (!droppedSuccessfully) {
    try {
        db.products.dropIndex({ "name": 1 });
        print("✅ Approach 2: Successfully dropped index by specification { name: 1 }");
        droppedSuccessfully = true;
    } catch (e) {
        print(`❌ Approach 2 failed: ${e.message}`);
    }
}

// Approach 3: Drop all indexes and recreate (NUCLEAR option)
if (!droppedSuccessfully) {
    print("\n⚠️  Using nuclear option: dropping all indexes except _id...");
    try {
        // Get all indexes except _id
        var indexes = db.products.getIndexes();
        indexes.forEach(function (index) {
            if (index.name !== "_id_") {
                try {
                    db.products.dropIndex(index.name);
                    print(`Dropped: ${index.name}`);
                } catch (e) {
                    print(`Failed to drop ${index.name}: ${e.message}`);
                }
            }
        });

        print("✅ Approach 3: All non-_id indexes dropped");
        droppedSuccessfully = true;
    } catch (e) {
        print(`❌ Approach 3 failed: ${e.message}`);
    }
}

// 3. Create new non-unique indexes
if (droppedSuccessfully) {
    print("\n3. Creating new non-unique indexes...");

    try {
        // Non-unique name index for performance
        db.products.createIndex({ name: 1 }, {
            background: true,
            name: "name_1_non_unique"
        });
        print("✅ Created non-unique name index");
    } catch (e) {
        print(`❌ Failed to create name index: ${e.message}`);
    }

    try {
        // Barcode partial unique index
        db.products.createIndex(
            { barcode: 1, isDelete: 1 },
            {
                unique: true,
                partialFilterExpression: { isDelete: false },
                background: true,
                name: "barcode_active_unique"
            }
        );
        print("✅ Created barcode partial unique index");
    } catch (e) {
        print(`❌ Failed to create barcode index: ${e.message}`);
    }

    try {
        // Other performance indexes
        db.products.createIndex({ barcode: 1 }, { background: true, name: "barcode_1_new" });
        db.products.createIndex({ isDelete: 1 }, { background: true, name: "isDelete_1_new" });
        print("✅ Created performance indexes");
    } catch (e) {
        print(`❌ Failed to create performance indexes: ${e.message}`);
    }
}

// 4. Verify final state
print("\n4. Final indexes after emergency fix:");
db.products.getIndexes().forEach(function (index) {
    print(`- ${index.name}: ${JSON.stringify(index.key)}`);
    if (index.unique) {
        print(`  Unique: true${index.partialFilterExpression ? ', Partial: yes' : ''}`);
    }
});

// 5. Test duplicate names
print("\n5. Testing duplicate names...");
try {
    var testName = "Emergency Test " + new Date().getTime();
    var result1 = db.products.insertOne({
        name: testName,
        barcode: "EMERGENCY_001",
        brandId: ObjectId("507f1f77bcf86cd799439011"),
        categoryId: ObjectId("507f1f77bcf86cd799439011"),
        isDelete: false
    });

    var result2 = db.products.insertOne({
        name: testName, // Same name
        barcode: "EMERGENCY_002", // Different barcode
        brandId: ObjectId("507f1f77bcf86cd799439011"),
        categoryId: ObjectId("507f1f77bcf86cd799439011"),
        isDelete: false
    });

    print("✅ Successfully created two products with same name!");

    // Clean up test data
    db.products.deleteMany({ barcode: { $in: ["EMERGENCY_001", "EMERGENCY_002"] } });
    print("✅ Cleaned up test data");

} catch (e) {
    print(`❌ Test failed: ${e.message}`);
    // Clean up any partial test data
    db.products.deleteMany({ barcode: { $in: ["EMERGENCY_001", "EMERGENCY_002"] } });
}

print("\n=== EMERGENCY FIX COMPLETED ===");
print("You can now create products with duplicate names!"); 