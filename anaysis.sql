
-- [Dashboard - Q1] Overall business snapshot: total orders, revenue, items, avg order value
SELECT
    COUNT(*)                                  AS total_orders,
    SUM(total_value)                          AS total_revenue,
    SUM(items)                                AS total_items_ordered,
    ROUND(AVG(total_value)::NUMERIC, 2)       AS avg_order_value,
    MAX(total_value)                          AS highest_order_value,
    MIN(total_value)                          AS lowest_order_value
FROM "MANM".customer_orders;





-- =============================================================================
-- PAGE 2: INVENTORY
-- Stock analysis, valuation, category breakdown, and threshold monitoring
-- =============================================================================


-- [Inventory - Q1] Category-wise stock summary: total units, avg price, total value per category
SELECT
    category,
    COUNT(*)                                          AS item_count,
    SUM(current_stock)                                AS total_units,
    ROUND(AVG(unit_price)::NUMERIC, 2)                AS avg_unit_price,
    ROUND(SUM(current_stock * unit_price)::NUMERIC, 2) AS total_category_value
FROM "MANM".inventory
GROUP BY category
ORDER BY total_category_value DESC;


-- [Inventory - Q2] Items below minimum stock threshold (needs reordering)
SELECT
    item_code,
    item_name,
    category,
    current_stock,
    minimum_stock,
    (minimum_stock - current_stock)                   AS units_below_minimum,
    status,
    location
FROM "MANM".inventory
WHERE current_stock < minimum_stock
ORDER BY units_below_minimum DESC;





-- =============================================================================
-- PAGE 3: ORDER MANAGEMENT (customer_orders)
-- Sales analytics, customer rankings, delivery performance
-- =============================================================================

-- [Orders - Q1] Top 5 customers by total order value
SELECT
    customer_name,
    COUNT(*)                                  AS total_orders,
    SUM(total_value)                          AS total_spent,
    ROUND(AVG(total_value)::NUMERIC, 2)       AS avg_order_value,
    MAX(total_value)                          AS largest_order
FROM "MANM".customer_orders
GROUP BY customer_name
ORDER BY total_spent DESC
LIMIT 3;


-- [Orders - Q2] Order status distribution with revenue per status
SELECT
    status,
    COUNT(*)                                  AS order_count,
    SUM(total_value)                          AS total_value,
    ROUND(AVG(total_value)::NUMERIC, 2)       AS avg_value,
    SUM(items)                                AS total_items
FROM "MANM".customer_orders
GROUP BY status
ORDER BY order_count DESC;


-- [Orders - Q3] Top 5 highest-value orders with customer and product detail
SELECT
    order_number,
    customer_name,
    product_name,
    order_date,
    delivery_date,
    total_value,
    items,
    status
FROM "MANM".customer_orders
ORDER BY total_value DESC
LIMIT 5;






-- =============================================================================
-- PAGE 4: MATERIAL REQUIREMENT PLANNING (MRP)
-- Material availability, shortfalls, supplier dependency, lead time analysis
-- =============================================================================

-- [MRP - Q1] Top 5 materials with the highest shortfall (required vs available stock)
SELECT
    mrp.material_code,
    mrp.material_name,
    mrp.related_order,
    mrp.required_qty,
    COALESCE(inv.current_stock, 0)                             AS available_qty,
    GREATEST(0, mrp.required_qty - COALESCE(inv.current_stock, 0)) AS shortfall,
    mrp.supplier,
    mrp.lead_time
FROM "MANM".mrp
LEFT JOIN "MANM".inventory AS inv ON mrp.item_code = inv.item_code
ORDER BY shortfall DESC
LIMIT 5;


-- [MRP - Q2] Supplier-wise material count and total required quantity
SELECT
    supplier,
    COUNT(*)                                  AS material_count,
    SUM(required_qty)                         AS total_required_qty,
    COUNT(DISTINCT related_order)             AS orders_dependent,
    MIN(planned_date)                         AS earliest_planned_date
FROM "MANM".mrp
GROUP BY supplier
ORDER BY total_required_qty DESC;







-- =============================================================================
-- PAGE 5: MASTER PRODUCTION SCHEDULE (MPS)
-- Production load analysis, workstation usage, supervisor performance
-- =============================================================================

-- [MPS - Q1] Workstation production load: how many schedules assigned per workstation
SELECT
    workstation,
    COUNT(*)                                          AS total_schedules,
    COUNT(*) FILTER (WHERE status = 'In Progress')    AS in_progress,
    COUNT(*) FILTER (WHERE status = 'Completed')      AS completed,
    COUNT(*) FILTER (WHERE status = 'On Hold')        AS on_hold,
    COUNT(*) FILTER (WHERE status = 'Scheduled')      AS scheduled
FROM "MANM".mps
GROUP BY workstation
ORDER BY total_schedules DESC;


-- [MPS - Q2] Supervisor workload: number of schedules and priority breakdown per supervisor
SELECT
    supervisor,
    COUNT(*)                                  AS total_schedules,
    COUNT(*) FILTER (WHERE priority = 'High')   AS high_priority,
    COUNT(*) FILTER (WHERE priority = 'Medium') AS medium_priority,
    COUNT(*) FILTER (WHERE priority = 'Low')    AS low_priority
FROM "MANM".mps
GROUP BY supervisor
ORDER BY total_schedules DESC;






-- =============================================================================
-- PAGE 6: PROCUREMENT
-- Purchase order analysis, supplier spend, delivery lead times
-- =============================================================================

-- [Procurement - Q1] Top 5 suppliers by total spend (total_amount)
SELECT
    supplier,
    COUNT(*)                                  AS total_pos,
    SUM(quantity)                             AS total_units_ordered,
    ROUND(SUM(total_amount)::NUMERIC, 2)      AS total_spend,
    ROUND(AVG(unit_price)::NUMERIC, 2)        AS avg_unit_price
FROM "MANM".procurement
GROUP BY supplier
ORDER BY total_spend DESC
LIMIT 5;


-- [Procurement - Q2] Procurement status breakdown with value per status
SELECT
    status,
    COUNT(*)                                  AS po_count,
    SUM(quantity)                             AS total_quantity,
    ROUND(SUM(total_amount)::NUMERIC, 2)      AS total_value,
    ROUND(AVG(total_amount)::NUMERIC, 2)      AS avg_po_value
FROM "MANM".procurement
GROUP BY status
ORDER BY total_value DESC;


-- [Procurement - Q3] Top 5 highest value purchase orders
SELECT
    po_number,
    supplier,
    material_name,
    quantity,
    unit_price,
    total_amount,
    order_date,
    expected_delivery,
    status
FROM "MANM".procurement
ORDER BY total_amount DESC
LIMIT 5;




-- =============================================================================
-- PAGE 7: QUALITY CONTROL
-- Inspection pass/fail rates, defect analysis, inspector performance
-- =============================================================================

-- [Quality - Q1] Overall quality pass/fail/warning/pending summary
SELECT
    result,
    COUNT(*)                                  AS inspection_count,
    SUM(defect_count)                         AS total_defects,
    ROUND(AVG(defect_count)::NUMERIC, 2)      AS avg_defects_per_inspection,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) AS percentage
FROM "MANM".quality_control
GROUP BY result
ORDER BY inspection_count DESC;


-- [Quality - Q2] Top 5 products with the most defects
SELECT
    product_name,
    batch_number,
    inspection_date,
    inspector,
    test_type,
    result,
    defect_count,
    notes
FROM "MANM".quality_control
ORDER BY defect_count DESC
LIMIT 5;


-- [Quality - Q3] Inspector performance: inspections done and defects found per inspector
SELECT
    inspector,
    COUNT(*)                                  AS total_inspections,
    SUM(defect_count)                         AS total_defects_found,
    ROUND(AVG(defect_count)::NUMERIC, 2)      AS avg_defects_per_inspection,
    COUNT(*) FILTER (WHERE result = 'Pass')   AS passed,
    COUNT(*) FILTER (WHERE result = 'Fail')   AS failed
FROM "MANM".quality_control
GROUP BY inspector
ORDER BY total_inspections DESC;



-- =============================================================================
-- PAGE 8: LOGISTICS
-- Shipment tracking, carrier performance, route and priority analysis
-- =============================================================================


-- [Logistics - Q2] Shipment status distribution with priority breakdown
SELECT
    status,
    COUNT(*)                                  AS shipment_count,
    COUNT(*) FILTER (WHERE priority = 'High')   AS high_priority,
    COUNT(*) FILTER (WHERE priority = 'Medium') AS medium_priority,
    COUNT(*) FILTER (WHERE priority = 'Low')    AS low_priority
FROM "MANM".logistics
GROUP BY status
ORDER BY shipment_count DESC;


-- [Logistics - Q3] Top 5 shipments with the longest transit time (estimated_arrival - departure_date)
SELECT
    shipment_id,
    order_number,
    carrier,
    origin,
    destination,
    departure_date,
    estimated_arrival,
    (estimated_arrival - departure_date)      AS transit_days,
    status,
    priority
FROM "MANM".logistics
ORDER BY transit_days DESC
LIMIT 5;



-- =============================================================================
-- END OF ANALYSIS.SQL
-- Total: 8 Pages × 5 Queries = 40 Analytical Queries
-- Run in pgAdmin or psql connected to the MANM database
-- =============================================================================
