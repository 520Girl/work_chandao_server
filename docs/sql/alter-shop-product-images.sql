-- 商品多图：images JSON 数组，mainImage 仍保留为首图（兼容旧客户端）
ALTER TABLE `shop_product`
  ADD COLUMN `images` json NULL COMMENT '商品图列表' AFTER `mainImage`;

-- 历史数据：将已有主图写入 images
UPDATE `shop_product`
SET `images` = JSON_ARRAY(`mainImage`)
WHERE `mainImage` IS NOT NULL AND `mainImage` <> '' AND (`images` IS NULL OR JSON_LENGTH(`images`) = 0);
