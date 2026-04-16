-- =============================================================================
-- VATS ERP SYSTEM — ANALYTICAL QUERIES
-- Schema: MANM
-- Description: 5 analytical queries per page (8 pages = 40 queries total)
-- Pages: Dashboard | Inventory | Order Management | MRP | MPS |
--        Procurement | Quality Control | Logistics
-- =============================================================================


-- =============================================================================
-- PAGE 1: DASHBOARD
-- High-level KPI metrics that power the dashboard overview cards
-- =============================================================================

-- [Dashboard - Q1] Overall business snapshot: total orders, revenue, items, avg order value
SELECT
    COUNT(*)                                  AS total_orders,
    SUM(total_value)                          AS total_revenue,
    SUM(items)                                AS total_items_ordered,
    ROUND(AVG(total_value)::NUMERIC, 2)       AS avg_order_value,
    MAX(total_value)                          AS highest_order_value,
    MIN(total_value)                          AS lowest_order_value
FROM "MANM".customer_orders;


-- [Dashboard - Q2] Inventory health summary: count by status
SELECT
    status,
    COUNT(*)                                  AS item_count,
    SUM(current_stock)                        AS total_stock_units,
    ROUND(SUM(current_stock * unit_price)::NUMERIC, 2) AS total_stock_value
FROM "MANM".inventory
GROUP BY status
ORDER BY item_count DESC;


-- [Dashboard - Q3] Material shortfall alert: total materials in shortage and total units short
SELECT
    COUNT(*)                                  AS total_shortage_materials,
    SUM(GREATEST(0, mrp.required_qty - COALESCE(inv.current_stock, 0))) AS total_units_short,
    COUNT(DISTINCT mrp.related_order)         AS affected_orders
FROM "MANM".mrp
LEFT JOIN "MANM".inventory AS inv ON mrp.item_code = inv.item_code
WHERE mrp.required_qty > COALESCE(inv.current_stock, 0);


-- [Dashboard - Q4] Production schedule status breakdown (MPS)
SELECT
    status,
    COUNT(*)                                  AS schedule_count,
    MIN(planned_start_date)                   AS earliest_start,
    MAX(planned_end_date)                     AS latest_end
FROM "MANM".mps
GROUP BY status
ORDER BY schedule_count DESC;


-- [Dashboard - Q5] Logistics active shipment count and delayed shipments
SELECT
    COUNT(*)                                  AS total_shipments,
    COUNT(*) FILTER (WHERE status = 'In Transit')  AS in_transit,
    COUNT(*) FILTER (WHERE status = 'Delayed')     AS delayed,
    COUNT(*) FILTER (WHERE status = 'Delivered')   AS delivered,
    COUNT(*) FILTER (WHERE status = 'Preparing')   AS preparing
FROM "MANM".logistics;


-- =============================================================================
-- PAGE 2: INVENTORY
-- Stock analysis, valuation, category breakdown, and threshold monitoring
-- =============================================================================

-- [Inventory - Q1] Top 5 most valuable items by total stock value (current_stock × unit_price)
SELECT
    item_code,
    item_name,
    category,
    current_stock,
    unit_price,
    ROUND((current_stock * unit_price)::NUMERIC, 2) AS total_stock_value,
    location
FROM "MANM".inventory
ORDER BY total_stock_value DESC
LIMIT 5;


-- [Inventory - Q2] Category-wise stock summary: total units, avg price, total value per category
SELECT
    category,
    COUNT(*)                                          AS item_count,
    SUM(current_stock)                                AS total_units,
    ROUND(AVG(unit_price)::NUMERIC, 2)                AS avg_unit_price,
    ROUND(SUM(current_stock * unit_price)::NUMERIC, 2) AS total_category_value
FROM "MANM".inventory
GROUP BY category
ORDER BY total_category_value DESC;


-- [Inventory - Q3] Items below minimum stock threshold (needs reordering)
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


-- [Inventory - Q4] Max and min stock levels across all items
SELECT
    MAX(current_stock)                                AS max_stock,
    MIN(current_stock)                                AS min_stock,
    ROUND(AVG(current_stock)::NUMERIC, 2)             AS avg_stock,
    MAX(unit_price)                                   AS max_unit_price,
    MIN(unit_price)                                   AS min_unit_price,
    ROUND(AVG(unit_price)::NUMERIC, 2)                AS avg_unit_price,
    ROUND(SUM(current_stock * unit_price)::NUMERIC, 2) AS grand_total_inventory_value
FROM "MANM".inventory;


-- [Inventory - Q5] Stock utilization ratio: how full each item is relative to maximum capacity
SELECT
    item_code,
    item_name,
    current_stock,
    maximum_stock,
    ROUND((current_stock::NUMERIC / NULLIF(maximum_stock, 0) * 100), 1) AS utilization_pct,
    status
FROM "MANM".inventory
ORDER BY utilization_pct ASC;


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
LIMIT 5;


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


-- [Orders - Q4] Delivery timeline analysis: avg days between order and delivery per product
SELECT
    product_name,
    COUNT(*)                                          AS order_count,
    ROUND(AVG(delivery_date - order_date)::NUMERIC, 1) AS avg_delivery_days,
    MIN(delivery_date - order_date)                   AS min_delivery_days,
    MAX(delivery_date - order_date)                   AS max_delivery_days
FROM "MANM".customer_orders
GROUP BY product_name
ORDER BY avg_delivery_days DESC;


-- [Orders - Q5] Monthly order volume and revenue trend
SELECT
    TO_CHAR(order_date, 'YYYY-MM')            AS order_month,
    COUNT(*)                                  AS orders_placed,
    SUM(total_value)                          AS monthly_revenue,
    ROUND(AVG(total_value)::NUMERIC, 2)       AS avg_order_value
FROM "MANM".customer_orders
GROUP BY order_month
ORDER BY order_month ASC;


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


-- [MRP - Q3] MRP status summary: available vs required materials
SELECT
    CASE
        WHEN mrp.required_qty <= COALESCE(inv.current_stock, 0) THEN 'Available'
        ELSE 'Required'
    END                                       AS computed_status,
    COUNT(*)                                  AS material_count,
    SUM(mrp.required_qty)                     AS total_required_qty,
    SUM(COALESCE(inv.current_stock, 0))       AS total_available_qty
FROM "MANM".mrp
LEFT JOIN "MANM".inventory AS inv ON mrp.item_code = inv.item_code
GROUP BY computed_status;


-- [MRP - Q4] Orders with the most material dependencies (top 5 complex orders)
SELECT
    related_order,
    COUNT(*)                                  AS material_count,
    SUM(required_qty)                         AS total_materials_needed,
    COUNT(DISTINCT supplier)                  AS supplier_count
FROM "MANM".mrp
GROUP BY related_order
ORDER BY material_count DESC
LIMIT 5;


-- [MRP - Q5] Material planning timeline: materials due each planned date with shortfall count
SELECT
    planned_date,
    COUNT(*)                                  AS materials_planned,
    SUM(mrp.required_qty)                     AS total_required,
    COUNT(*) FILTER (
        WHERE mrp.required_qty > COALESCE(inv.current_stock, 0)
    )                                         AS shortage_count
FROM "MANM".mrp
LEFT JOIN "MANM".inventory AS inv ON mrp.item_code = inv.item_code
GROUP BY planned_date
ORDER BY planned_date ASC;


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


-- [MPS - Q3] Top 5 longest production runs by planned duration (end - start days)
SELECT
    schedule_id,
    product_name,
    order_number,
    planned_start_date,
    planned_end_date,
    (planned_end_date - planned_start_date)   AS planned_duration_days,
    workstation,
    supervisor,
    priority,
    status
FROM "MANM".mps
ORDER BY planned_duration_days DESC
LIMIT 5;


-- [MPS - Q4] Priority distribution with average production duration
SELECT
    priority,
    COUNT(*)                                          AS schedule_count,
    ROUND(AVG(planned_end_date - planned_start_date)::NUMERIC, 1) AS avg_duration_days,
    MIN(planned_start_date)                           AS earliest_start,
    MAX(planned_end_date)                             AS latest_end
FROM "MANM".mps
GROUP BY priority
ORDER BY
    CASE priority WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 WHEN 'Low' THEN 3 END;


-- [MPS - Q5] Production schedule gantt summary: all schedules ordered by start date with duration
SELECT
    schedule_id,
    product_name,
    order_number,
    planned_start_date,
    planned_end_date,
    (planned_end_date - planned_start_date)   AS duration_days,
    status,
    priority,
    workstation
FROM "MANM".mps
ORDER BY planned_start_date ASC, priority DESC;


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


-- [Procurement - Q4] Procurement delivery lead time: days between order and expected delivery
SELECT
    po_number,
    supplier,
    material_name,
    order_date,
    expected_delivery,
    (expected_delivery - order_date)          AS lead_time_days,
    status
FROM "MANM".procurement
ORDER BY lead_time_days DESC;


-- [Procurement - Q5] Material procurement frequency: which materials are ordered most
SELECT
    material_name,
    COUNT(*)                                  AS times_ordered,
    SUM(quantity)                             AS total_quantity_procured,
    ROUND(SUM(total_amount)::NUMERIC, 2)      AS total_spend,
    ROUND(AVG(unit_price)::NUMERIC, 2)        AS avg_unit_price
FROM "MANM".procurement
GROUP BY material_name
ORDER BY total_quantity_procured DESC;


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


-- [Quality - Q4] Test type effectiveness: pass rate and avg defects per test type
SELECT
    test_type,
    COUNT(*)                                  AS tests_conducted,
    COUNT(*) FILTER (WHERE result = 'Pass')   AS passed,
    COUNT(*) FILTER (WHERE result = 'Fail')   AS failed,
    ROUND(
        COUNT(*) FILTER (WHERE result = 'Pass') * 100.0 / NULLIF(COUNT(*), 0),
        1
    )                                         AS pass_rate_pct,
    ROUND(AVG(defect_count)::NUMERIC, 2)      AS avg_defects
FROM "MANM".quality_control
GROUP BY test_type
ORDER BY pass_rate_pct DESC;


-- [Quality - Q5] Monthly inspection trend with defect rate over time
SELECT
    TO_CHAR(inspection_date, 'YYYY-MM')       AS inspection_month,
    COUNT(*)                                  AS inspections,
    SUM(defect_count)                         AS total_defects,
    ROUND(AVG(defect_count)::NUMERIC, 2)      AS avg_defects,
    COUNT(*) FILTER (WHERE result = 'Pass')   AS passed,
    COUNT(*) FILTER (WHERE result = 'Fail')   AS failed
FROM "MANM".quality_control
GROUP BY inspection_month
ORDER BY inspection_month ASC;


-- =============================================================================
-- PAGE 8: LOGISTICS
-- Shipment tracking, carrier performance, route and priority analysis
-- =============================================================================

-- [Logistics - Q1] Carrier performance: total shipments and delivery success rate
SELECT
    carrier,
    COUNT(*)                                  AS total_shipments,
    COUNT(*) FILTER (WHERE status = 'Delivered')   AS delivered,
    COUNT(*) FILTER (WHERE status = 'In Transit')  AS in_transit,
    COUNT(*) FILTER (WHERE status = 'Delayed')     AS delayed,
    ROUND(
        COUNT(*) FILTER (WHERE status = 'Delivered') * 100.0 / NULLIF(COUNT(*), 0),
        1
    )                                         AS delivery_success_pct
FROM "MANM".logistics
GROUP BY carrier
ORDER BY total_shipments DESC;


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


-- [Logistics - Q4] Most frequent origin-destination routes
SELECT
    origin,
    destination,
    COUNT(*)                                  AS shipment_count,
    ROUND(AVG(estimated_arrival - departure_date)::NUMERIC, 1) AS avg_transit_days,
    COUNT(*) FILTER (WHERE status = 'Delivered') AS successful_deliveries
FROM "MANM".logistics
GROUP BY origin, destination
ORDER BY shipment_count DESC;


-- [Logistics - Q5] Priority-wise average transit time and on-time delivery analysis
SELECT
    priority,
    COUNT(*)                                          AS total_shipments,
    ROUND(AVG(estimated_arrival - departure_date)::NUMERIC, 1) AS avg_transit_days,
    MIN(estimated_arrival - departure_date)           AS min_transit_days,
    MAX(estimated_arrival - departure_date)           AS max_transit_days,
    COUNT(*) FILTER (WHERE status = 'Delivered')      AS delivered_count
FROM "MANM".logistics
GROUP BY priority
ORDER BY
    CASE priority WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 WHEN 'Low' THEN 3 END;


-- =============================================================================
-- END OF ANALYSIS.SQL
-- Total: 8 Pages × 5 Queries = 40 Analytical Queries
-- Run in pgAdmin or psql connected to the MANM database
-- =============================================================================
