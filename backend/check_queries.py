"""
Helper script to add is_disposed filter to all important inventory queries
This ensures disposed items are excluded from normal operations
"""

import re

def add_filter_to_queries():
    print("=" * 80)
    print("📋 Queries that need is_disposed filter:")
    print("=" * 80)
    
    queries_to_update = [
        {
            "location": "get_inventory_report",
            "line": "~1287",
            "description": "Inventory report endpoint - exclude disposed from reports"
        },
        {
            "location": "export_excel",
            "line": "~1320", 
            "description": "Excel export - exclude disposed from exports"
        },
        {
            "location": "export_pdf",
            "line": "~1357",
            "description": "PDF export - exclude disposed from exports"
        },
        {
            "location": "check_warehouse_usage (line ~203)",
            "description": "Warehouse deletion check - should count disposed items"
        },
        {
            "location": "check_drug_usage (line ~303)",
            "description": "Drug deletion check - should count disposed items"
        },
        {
            "location": "check_supplier_usage (line ~378)",
            "description": "Supplier deletion check - should count disposed items"
        }
    ]
    
    print("\n✅ Already filtered:")
    print("   - get_inventory (main endpoint)")
    print("   - expiring_drugs (dashboard card)")
    print("   - create_transfer (only active inventory can be transferred)")
    
    print("\n⚠️  Need manual update:")
    for q in queries_to_update:
        print(f"\n   📍 {q['location']}")
        print(f"      {q['description']}")
    
    print("\n" + "=" * 80)
    print("💡 Recommendation:")
    print("=" * 80)
    print("""
For reports and exports:
    Add: .filter(Inventory.is_disposed == False)
    
For deletion checks (should count ALL including disposed):
    Keep as is - no filter needed
    
This maintains data integrity while hiding disposed items from normal operations.
""")

if __name__ == "__main__":
    add_filter_to_queries()
