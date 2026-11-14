CREATE TABLE dbo.Students (StudentID INT PRIMARY KEY, Name NVARCHAR(30), Major NVARCHAR(30), Year INT CHECK(Year BETWEEN 1 AND 4));
CREATE TABLE dbo.Courses (CourseID INT PRIMARY KEY, Title NVARCHAR(50), Credits INT, Professor NVARCHAR(30));
CREATE TABLE dbo.Enrollments (StudentID INT REFERENCES dbo.Students(StudentID), CourseID INT REFERENCES dbo.Courses(CourseID), Score DECIMAL(5,2) NULL, Semester VARCHAR(10), PRIMARY KEY(StudentID,CourseID,Semester));
-- PDF 학습용 원본 상태: exam에는 수험번호가 없고, exam_emp에는 아직 PK가 없습니다.
-- 주민등록번호는 실습 전용 임의의 6자리 코드이며 실제 개인정보가 아닙니다.
CREATE TABLE dbo.exam ([성명] NCHAR(10) NOT NULL, [학번] INT NOT NULL, [영어] INT NULL, [수학] INT NULL, [부서] NVARCHAR(20) NULL, [학력] NVARCHAR(20) NULL, [전형구분] NVARCHAR(20) NULL);
CREATE TABLE dbo.exam_emp ([수험번호] INT NULL, [성명] NVARCHAR(20) NOT NULL, [주소] NVARCHAR(80) NULL, [부서] NVARCHAR(20) NULL, [병역] NVARCHAR(10) NULL, [학력] NVARCHAR(20), [전형구분] NVARCHAR(20), [주민등록번호] INT NULL, [우편번호] VARCHAR(5) NULL);
INSERT dbo.Students VALUES (1,N'김진희',N'컴퓨터공학',2),(2,N'전현희',N'경영학',3),(3,N'이준',N'컴퓨터공학',1),(4,N'박지민',N'통계학',4),(5,N'최서연',N'경영학',2),(6,N'윤도현',N'컴퓨터공학',3);
INSERT dbo.Courses VALUES (101,N'데이터베이스',3,N'김교수'),(102,N'자료구조',3,N'이교수'),(103,N'통계 입문',2,N'박교수'),(104,N'경영 정보',3,N'최교수');
INSERT dbo.Enrollments VALUES (1,101,95,'2025-2'),(1,102,87,'2025-2'),(2,101,81,'2025-2'),(2,104,92,'2025-2'),(3,101,76,'2025-2'),(3,102,NULL,'2025-2'),(4,103,98,'2025-2'),(5,104,85,'2025-2'),(6,101,88,'2025-2'),(6,102,91,'2025-2');
INSERT dbo.exam VALUES
 (N'김진희',1001,98,87,NULL,NULL,NULL),(N'전현희',1002,95,92,NULL,NULL,NULL),(N'이준',1003,93,75,NULL,NULL,NULL),
 (N'박지민',1004,92,88,NULL,NULL,NULL),(N'최서연',1005,91,65,NULL,NULL,NULL),(N'윤도현',1006,90,72,NULL,NULL,NULL),
 (N'정수아',1007,89,90,NULL,NULL,NULL),(N'한예준',1008,88,80,NULL,NULL,NULL),(N'조하은',1009,86,85,NULL,NULL,NULL),
 (N'강기민',1010,85,75,NULL,NULL,NULL),(N'문호성',1011,85,75,NULL,NULL,NULL),(N'김세연',1012,85,80,NULL,NULL,NULL),
 (N'천석훈',1013,70,80,NULL,NULL,NULL),(N'서준',1014,60,55,NULL,NULL,NULL),(N'오유진',1015,50,45,NULL,NULL,NULL),
 (N'홍길동',1016,75,60,NULL,NULL,NULL),(N'홍길동',1017,80,70,NULL,NULL,NULL),(N'김민수',1018,65,50,NULL,NULL,NULL),
 (N'김민수',1019,NULL,65,NULL,NULL,NULL),(N'미등록',1020,77,68,NULL,NULL,NULL);
INSERT dbo.exam_emp VALUES
 (1001,N'김진희',N'부산 수영구 광안동',N'부산지점',N'미필',N'대학교',N'일반',990101,'48200'),
 (1002,N'전현희',N'부산 광안해변로',N'부산지점',N'미필',N'대학교',N'일반',980202,NULL),
 (1003,N'이준',N'서울 강남구',N'서울지점',N'군필',N'고등학교',N'특별',970303,'06000'),
 (1004,N'박지민',N'부산 해운대구',N'부산지점',N'군필',N'대학교',N'일반',960404,'48000'),
 (1005,N'최서연',N'서울 마포구',N'서울지점',N'미필',N'대학원',N'일반',950505,NULL),
 (1006,N'윤도현',N'대전 유성구',N'대전지점',N'군필',N'대학교',N'특별',940606,'34000'),
 (1007,N'정수아',N'부산 광안동',N'부산지점',N'미필',N'대학교',N'일반',930707,'48200'),
 (1008,N'한예준',N'부산 남구',N'부산지점',N'군필',N'대학교',N'일반',920808,'48500'),
 (1009,N'조하은',N'인천 연수구',N'인천지점',N'미필',N'대학교',N'일반',910909,NULL),
 (1010,N'강기민',N'부산 수영구',N'부산지점',N'군필',N'대학교',N'일반',901010,'48200'),
 (1011,N'문호성',N'부산 해운대구',N'부산지점',N'군필',N'대학교',N'일반',991111,'48000'),
 (1012,N'김세연',N'서울 종로구',N'서울지점',N'미필',N'대학교',N'일반',981212,NULL),
 (1013,N'천석훈',N'부산 부산진구',N'부산지점',N'군필',N'대학원',N'특별',970101,'47000'),
 (1014,N'서준',N'대구 수성구',N'대구지점',N'군필',N'고등학교',N'일반',960202,'42000'),
 (1015,N'오유진',N'부산 광안동',N'부산지점',N'미필',N'대학교',N'일반',950303,NULL),
 (1016,N'홍길동',N'서울 강서구',N'서울지점',N'군필',N'대학교',N'일반',940404,'07000'),
 (1017,N'홍길동',N'서울 은평구',N'서울지점',N'군필',N'대학교',N'일반',930505,'03000'),
 (1018,N'김민수',N'부산 동래구',N'부산지점',N'군필',N'대학교',N'일반',920606,'47700'),
 (1019,N'김민수',N'부산 연제구',N'부산지점',N'군필',N'대학교',N'일반',910707,'47500'),
 (2021,N'미응시',N'부산 광안동',N'부산지점',N'미필',N'고등학교',N'특별',900808,NULL);
-- HAVING COUNT(*) > 50 실습도 실제 결과가 나오도록 120명의 가상 지원자 추가.
;WITH numbers AS (SELECT 1 AS n UNION ALL SELECT n+1 FROM numbers WHERE n<120)
INSERT dbo.exam_emp
SELECT 3000+n,N'가상지원자'+CAST(n AS NVARCHAR(4)),N'부산 수영구 광안동',N'부산지점',
 CASE WHEN n<=65 THEN N'군필' ELSE N'미필' END,N'대학교',N'일반',800000+n,
 CASE WHEN n%5=0 THEN NULL ELSE '48200' END FROM numbers OPTION(MAXRECURSION 120);
