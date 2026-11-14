CREATE TABLE dbo.Customers (CustomerID INT PRIMARY KEY, Name NVARCHAR(30) NOT NULL, City NVARCHAR(30), Email VARCHAR(100) UNIQUE, JoinedAt DATE);
CREATE TABLE dbo.Products (ProductID INT PRIMARY KEY, Name NVARCHAR(60) NOT NULL, Category NVARCHAR(30), Price DECIMAL(12,2) CHECK(Price>=0), Stock INT CHECK(Stock>=0));
CREATE TABLE dbo.Orders (OrderID INT PRIMARY KEY, CustomerID INT REFERENCES dbo.Customers(CustomerID), OrderDate DATE, Status NVARCHAR(20));
CREATE TABLE dbo.OrderItems (OrderID INT REFERENCES dbo.Orders(OrderID), ProductID INT REFERENCES dbo.Products(ProductID), Quantity INT CHECK(Quantity>0), UnitPrice DECIMAL(12,2), PRIMARY KEY(OrderID,ProductID));
CREATE TABLE dbo.[제조사] ([제조사ID] INT PRIMARY KEY, [제조사명] NVARCHAR(30), [공장주소] NVARCHAR(50));
CREATE TABLE dbo.[컵라면] ([제품명] NVARCHAR(60) NOT NULL PRIMARY KEY, [가격] INT NULL, [제조사ID] INT NULL REFERENCES dbo.[제조사]([제조사ID]), [칼로리] INT NULL);
INSERT dbo.Customers VALUES
 (1,N'김민서',N'서울','minseo@example.test','2024-01-15'),(2,N'이도현',N'부산','dohyun@example.test','2024-03-02'),
 (3,N'박서윤',N'대전','seoyun@example.test','2024-05-20'),(4,N'최하린',N'서울','harin@example.test','2025-02-08'),
 (5,N'정지후',N'인천','jihu@example.test','2025-06-11'),(6,N'강예린',N'부산','yerin@example.test','2025-08-01'),
 (7,N'윤건우',N'제주','gunwoo@example.test','2025-09-12'),(8,N'송나은',N'서울','naeun@example.test','2025-10-02');
INSERT dbo.Products VALUES (1,N'무선 키보드',N'전자기기',89000,32),(2,N'마우스',N'전자기기',45000,54),(3,N'모니터',N'전자기기',299000,15),
 (4,N'노트',N'문구',3500,120),(5,N'펜 세트',N'문구',12000,80),(6,N'텀블러',N'생활',28000,40),(7,N'책상 조명',N'생활',39000,0),(8,N'마우스 패드',N'전자기기',15000,65);
INSERT dbo.Orders VALUES (101,1,'2025-09-01',N'배송완료'),(102,2,'2025-09-03',N'배송완료'),(103,1,'2025-09-10',N'배송완료'),
 (104,3,'2025-09-12',N'배송중'),(105,4,'2025-09-14',N'결제완료'),(106,5,'2025-09-15',N'취소'),(107,2,'2025-10-01',N'배송완료'),
 (108,6,'2025-10-03',N'결제완료'),(109,3,'2025-10-04',N'배송중'),(110,1,'2025-10-10',N'배송완료');
INSERT dbo.OrderItems VALUES (101,1,1,89000),(101,2,1,45000),(102,3,1,299000),(103,4,5,3500),(103,5,2,12000),
 (104,6,2,28000),(105,1,1,89000),(105,8,1,15000),(106,7,1,39000),(107,2,2,45000),(108,6,1,28000),(109,4,10,3500),(110,3,1,299000),(110,8,2,15000);
INSERT dbo.[제조사] VALUES (1,N'농심',N'부산'),(2,N'삼양',N'원주'),(3,N'오뚜기',N'안양'),(4,N'팔도',N'나주');
INSERT dbo.[컵라면] VALUES (N'불닭볶음면',1500,2,500),(N'진라면',1000,3,450),(N'육개장',800,1,400),
 (N'신라면',1400,1,490),(N'짜파게티',1600,1,550),(N'사리곰탕',1500,1,460),(N'비빔면',1300,4,530),(N'미정라면',NULL,NULL,NULL);
