SET @pColExists := (
  SELECT COUNT(1)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'post_info'
    AND COLUMN_NAME = 'province'
);
SET @pDdl := IF(
  @pColExists = 0,
  'ALTER TABLE `post_info`
    ADD COLUMN `province` VARCHAR(50) NULL COMMENT ''省份(展示用)'',
    ADD COLUMN `city` VARCHAR(50) NULL COMMENT ''城市(展示用)''',
  'SELECT 1'
);
PREPARE stmt FROM @pDdl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
