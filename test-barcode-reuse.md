# Test Barcode Reuse Feature

## Mô tả
Tính năng này cho phép tái sử dụng mã sản phẩm (barcode) của những sản phẩm đã bị xóa (isDelete = true).

## Các thay đổi đã thực hiện

### Backend
1. **ProductRepository** (`product.repository.ts`):
   - Cập nhật `findByProductByBarCode()` để chỉ tìm trong sản phẩm chưa bị xóa
   - Thêm `findByProductByBarCodeExcludingId()` cho trường hợp update

2. **ProductUseCase** (`product.use-cases.ts`):
   - Thêm validation barcode trong method `update()`
   - Đảm bảo kiểm tra trùng barcode chỉ với sản phẩm chưa bị xóa

3. **ProductEntity** (`product.entity.ts`):
   - Xóa unique constraint trên field `barcode`
   - Thêm index riêng cho `barcode` và `isDelete` để tối ưu performance

### Frontend
4. **Error Handler** (`errorHandler.ts`):
   - Thêm mapping cho các lỗi liên quan đến barcode
   - Cải thiện hiển thị thông báo lỗi bằng tiếng Việt

## Test Cases

### Test Case 1: Tạo sản phẩm mới với barcode chưa tồn tại
```
POST /products
{
  "name": "Sản phẩm test 1",
  "barcode": "TEST001",
  ...
}
Expected: Tạo thành công
```

### Test Case 2: Tạo sản phẩm với barcode đã tồn tại (sản phẩm chưa bị xóa)
```
POST /products
{
  "name": "Sản phẩm test 2", 
  "barcode": "TEST001",
  ...
}
Expected: Lỗi "Mã sản phẩm đã tồn tại"
```

### Test Case 3: Xóa sản phẩm (soft delete)
```
DELETE /products/{id}
Expected: isDelete = true
```

### Test Case 4: Tạo sản phẩm mới với barcode của sản phẩm đã bị xóa
```
POST /products
{
  "name": "Sản phẩm test 3",
  "barcode": "TEST001", // Barcode của sản phẩm đã bị xóa
  ...
}
Expected: Tạo thành công (có thể tái sử dụng barcode)
```

### Test Case 5: Update barcode thành barcode đã tồn tại
```
PUT /products/{id}
{
  "barcode": "EXISTING_BARCODE"
}
Expected: Lỗi "Mã sản phẩm đã tồn tại"
```

### Test Case 6: Update barcode thành barcode của sản phẩm đã bị xóa
```
PUT /products/{id}
{
  "barcode": "DELETED_PRODUCT_BARCODE"
}
Expected: Cập nhật thành công
```

## Chạy test

1. Start backend server
2. Sử dụng Postman hoặc frontend để test các case trên
3. Kiểm tra database để đảm bảo dữ liệu đúng

## Cleanup Database (nếu cần)

Để xóa unique index cũ trên field barcode (nếu có):

```javascript
// MongoDB shell
db.products.dropIndex({ "barcode": 1 }) // Nếu có unique index cũ
```

## Notes

- Tính năng này chỉ áp dụng cho soft delete (isDelete = true)
- Hard delete vẫn có thể tái sử dụng barcode vì record đã bị xóa hoàn toàn
- Performance được tối ưu bằng index riêng trên barcode và isDelete 