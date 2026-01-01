// Script để sửa lại MongoDB index cho barcode field
// Chạy script này trong MongoDB shell hoặc qua connection

// Connect to your MongoDB database
// use your_database_name

// 1. Drop tất cả các index cũ liên quan đến barcode và name
db.products.dropIndex({ "barcode": 1 });
db.products.dropIndex({ "barcode": 1, "isDelete": 1 });

// Drop unique index cho barcode nếu có
try {
    db.products.dropIndex({ "barcode": 1 }, { unique: true });
} catch (e) {
    print("No unique barcode index found, continuing...");
}

// Drop unique index cho name nếu có
try {
    db.products.dropIndex({ "name": 1 }, { unique: true });
    print("Dropped unique name index");
} catch (e) {
    print("No unique name index found, continuing...");
}

// 2. Tạo lại các index mới theo thiết kế trong schema
// Index chính: barcode unique chỉ với sản phẩm chưa xóa
db.products.createIndex(
    { barcode: 1, isDelete: 1 },
    {
        unique: true,
        partialFilterExpression: { isDelete: false },
        background: true,
        name: "barcode_active_unique"
    }
);

// Index phụ cho performance
db.products.createIndex({ barcode: 1 }, { background: true, name: "barcode_1" });
db.products.createIndex({ isDelete: 1 }, { background: true, name: "isDelete_1" });
db.products.createIndex({ name: 1 }, { background: true, name: "name_1_non_unique" }); // Non-unique index cho name

// 3. Verify indexes đã được tạo đúng
print("Current indexes on products collection:");
db.products.getIndexes().forEach(function (index) {
    printjson(index);
});

// 4. Test query để đảm bảo hoạt động đúng
print("\nTesting barcode queries...");

// Test 1: Tìm sản phẩm active theo barcode
var activeResult = db.products.findOne({
    barcode: "TEST001",
    $or: [
        { isDelete: false },
        { isDelete: { $exists: false } }
    ]
});
print("Active product with barcode TEST001:", activeResult ? "Found" : "Not found");

// Test 2: Tìm tất cả sản phẩm theo barcode (bao gồm cả đã xóa)
var allResults = db.products.find({ barcode: "TEST001" }).count();
print("Total products with barcode TEST001 (including deleted):", allResults);

print("\nBarcode index fix completed successfully!"); 