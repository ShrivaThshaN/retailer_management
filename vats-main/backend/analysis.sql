-- 1)TOP SELLING PRODUCTS
SELECT product_name AS Product_Name, SUM(items) AS Quantity_Sold, SUM(total_value) AS Revenue FROM "MANM".customer_orders
GROUP BY product_name ORDER BY Revenue DESC;

-- 2)MOST VALUABLE CUSTOMERS
SELECT customer_name AS Customer_Name, COUNT(order_number) AS Total_Orders, SUM(total_value) AS Total_Amount_Spent FROM "MANM".customer_orders
GROUP BY customer_name ORDER BY Total_Amount_Spent DESC LIMIT 5;

-- 3)MONTHLY REVENUE CALCULATION
SELECT TO_CHAR(order_date,'YY-MM') AS Sales_Month, SUM(total_value) AS Revenue FROM "MANM".customer_orders
GROUP BY Sales_Month ORDER BY Sales_Month DESC;

-- 4)CATEGORY WISE INVENTORY ANALYSIS
SELECT category AS Category, COUNT(item_code) AS Total_Items, SUM(current_stock * unit_price) AS Stock_Value
FROM "MANM".inventory GROUP BY category ORDER BY Stock_Value DESC;

-- 5)DETECT LOW / OUT OF STOCK ITEMS
SELECT item_code, item_name, current_stock, minimum_stock, status FROM "MANM".inventory
WHERE current_stock <= minimum_stock ORDER BY current_stock ASC;
