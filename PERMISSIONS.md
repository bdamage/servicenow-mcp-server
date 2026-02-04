# ServiceNow MCP Server - Permissions Guide

This document outlines the permissions and roles required to use all features of the ServiceNow MCP server, along with troubleshooting steps for common permission issues.

## Quick Reference: Required Roles

### For Full Functionality (All 19 Tools)

| Tool Category | Required Roles | Tables Accessed |
|--------------|----------------|-----------------|
| **Basic CRUD Operations** | `itil` or `admin` | Various tables |
| **Batch Operations** | `itil` or `admin` | Various tables |
| **CMDB Operations** | `sn_cmdb_admin` + `service_viewer` + `itil` | `cmdb_ci`, `cmdb_rel_ci` |
| **Event Management** | `evt_mgmt_integration` + `evt_mgmt_admin` | `em_event` |
| **Service Management** | `sn_cmdb_admin` + `service_viewer` + `itil` | `cmdb_ci_service`, `cmdb_rel_ci` |

### Minimum Required Roles (Recommended Setup)

For a standard user to use all MCP server features:

```
✅ itil                      - General ITSM operations
✅ sn_cmdb_admin             - CMDB administration (namespaced version)
✅ service_viewer            - Required for cmdb_ci_service table access
✅ evt_mgmt_integration      - Event creation
✅ evt_mgmt_admin            - Event querying and management
```

### Read-Only Access

For users who only need to query/read data:

```
✅ itil_read_only           - Read-only ITSM access
✅ sn_cmdb_user             - Basic CMDB workspace access
✅ evt_mgmt_operator        - Event Management read-only
```

---

## Detailed Permissions by Tool

### 1. Basic CRUD Operations (8 tools)

**Tools:**
- `query_table`, `get_record`, `search_incidents`, `get_user`
- `create_record`, `update_record`, `get_table_schema`, `delete_record`

**Required Roles:**
- **`itil`** - Standard ITIL role (recommended)
- **`admin`** - System administrator (for testing/development)

**Tables Accessed:**
- Various tables depending on queries
- Common: `incident`, `sys_user`, `change_request`, etc.

**Permissions:**
- Read: View records in specified tables
- Write: Create/Update records (for create/update tools)
- Delete: Remove records (for delete tool)

---

### 2. Batch Operations (3 tools)

**Tools:**
- `batch_create_records`, `batch_update_records`, `batch_query_tables`

**Required Roles:**
- Same as Basic CRUD Operations
- **`itil`** or **`admin`**

**Special Notes:**
- Batch operations execute in parallel
- Same permissions apply as single operations
- Max 100 records per batch create/update
- Max 20 queries per batch query

---

### 3. CMDB Operations (3 tools)

**Tools:**
- `get_ci_relationships`, `get_impact_analysis`, `query_cmdb_ci`

**Required Roles:**
- **`sn_cmdb_admin`** - CMDB administration (namespaced version)
- **`itil`** - General ITIL operations
- **`service_viewer`** - Required for service table access

**Tables Accessed:**
- `cmdb_ci` - Configuration Items
- `cmdb_rel_ci` - CI Relationships
- `cmdb_ci_service` - Services

**Permissions:**
- Read: Query CIs, relationships, and impact data
- Required for impact analysis and relationship traversal

---

### 4. Event Management (2 tools)

**Tools:**
- `create_event`, `query_events`

**Required Roles:**

#### For Event Creation (`create_event`):
- **`evt_mgmt_integration`** - Event Management Integration role ⭐ CRITICAL
- **`evt_mgmt_admin`** - Event Management Administrator (alternative)
- **`admin`** - System administrator (full access)

#### For Event Querying (`query_events`):
- **`evt_mgmt_operator`** - Event Management Operator (read-only)
- **`evt_mgmt_admin`** - Event Management Administrator
- Any role with read access to `em_event` table

**Tables Accessed:**
- `em_event` - Event Management events

**Permissions:**
- Write: Create events for monitoring/alerting (`create_event`)
- Read: Query and analyze events (`query_events`)

---

### 5. Service Management (3 tools)

**Tools:**
- `create_service`, `link_ci_to_service`, `get_service_map`

**Required Roles:** ⚠️ MOST COMPLEX PERMISSIONS

#### For Service Creation (`create_service`):
- **`sn_cmdb_admin`** - CMDB administration ✅
- **`service_viewer`** - Required for cmdb_ci_service table ⭐ CRITICAL
- **`itil`** - General ITIL operations ✅

#### For Linking CIs to Services (`link_ci_to_service`):
- **`sn_cmdb_admin`** - CMDB administration
- **`service_viewer`** - Service table access
- **`itil`** - Relationship creation

#### For Service Mapping (`get_service_map`):
- **`service_viewer`** - Service table read access
- **`itil_read_only`** - Read-only ITIL (minimum)
- **`sn_cmdb_user`** - CMDB workspace access

**Tables Accessed:**
- `cmdb_ci_service` - Business and Technical Services
- `cmdb_ci` - Configuration Items
- `cmdb_rel_ci` - Relationships between Services and CIs
- `sys_user` - User lookups for service owners
- `sys_user_group` - Group lookups for support teams

**Permissions:**
- Write: Create services, link CIs to services
- Read: Query services, view topology, get service maps

---

## Common Permission Issues & Solutions

### Issue 1: "Access Denied" Creating Services

**Symptom:**
```
Error: Forbidden: You don't have permission to create this resource.
```

**Cause:**
Missing `service_viewer` role, even if you have `sn_cmdb_admin`.

**Solution:**
The `cmdb_ci_service` table requires **BOTH** roles:
1. ✅ `sn_cmdb_admin` (for CMDB administration)
2. ✅ `service_viewer` (specifically for service table access)

**Action:**
Ask your ServiceNow admin to add the `service_viewer` role to your user.

**Reference:**
- [ServiceNow Community - Restrict Write access on cmdb_ci_service table](https://www.servicenow.com/community/developer-forum/restrict-write-access-on-cmdb-ci-service-table-to-ci-owners-and/td-p/2553803)

---

### Issue 2: Role Exists But Still Access Denied

**Symptom:**
User has correct roles but still gets "access denied" errors.

**Possible Causes:**

#### A. Custom ACLs (Access Control Lists)
Your instance may have custom ACLs that override standard role permissions.

**How to Check:**
1. Navigate to **System Security > Access Control (ACL)**
2. Filter by: `Name = cmdb_ci_service` and `Operation = create`
3. Look for active ACLs with custom scripts or conditions
4. Check inherited ACLs from parent table `cmdb_ci`

**Solution:**
- Ask admin to review custom ACLs
- Temporarily deactivate suspicious ACLs (set `active=false`) to test
- Modify ACL to include your user/role or create exception

**Reference:**
- [ServiceNow Community - CMDB Edit Access](https://www.servicenow.com/community/cmdb-forum/cmdb-edit-access/m-p/2519963)

#### B. Data Policies or Business Rules
Data Policies, UI Policies, or Business Rules on the table might restrict access.

**How to Check:**
1. Navigate to **System Policy > Data Policies**
2. Filter by table: `cmdb_ci_service`
3. Look for policies that apply on **insert** or **write**
4. Check **System Definition > Business Rules** for blocking rules

**Solution:**
Ask admin to review and modify restrictive policies/rules.

**Reference:**
- [ServiceNow Community - CMDB Roles](https://www.servicenow.com/community/cmdb-forum/cmdb-roles/m-p/248674)

#### C. DevOps Insights ACL Conflict (Known Issue)
If **DevOps Insights 1.36** is installed, it adds ACLs that hide Business Service and Business Application CIs.

**How to Check:**
- Navigate to **System Applications > All Available Applications > All**
- Search for "DevOps Insights"
- Check version

**Solution:**
Review/modify the problematic ACLs added by DevOps Insights plugin.

**Reference:**
- [ServiceNow KB - DevOps Insights ACLs Hide Business Services](https://support.servicenow.com/kb?id=kb_article_view&sysparm_article=KB1218388)

---

### Issue 3: Cannot Find Role `cmdb_admin`

**Symptom:**
Role `cmdb_admin` doesn't exist in your instance.

**Cause:**
Newer ServiceNow instances use namespaced roles.

**Solution:**
Use the namespaced version: **`sn_cmdb_admin`** instead of `cmdb_admin`.

**Common Role Name Variations:**
- `cmdb_admin` → `sn_cmdb_admin` (newer instances)
- `evt_mgmt_admin` → `sn_event_management.admin` (some versions)
- `service_portfolio_admin` → `spm_admin` (some versions)

---

## Troubleshooting Tools

### 1. Access Analyzer (Vancouver+ Versions)

**Use the built-in Access Analyzer to identify blocking ACLs:**

1. Navigate to **System Security > Access Analyzer**
2. Enter your username
3. Enter table: `cmdb_ci_service`
4. Select operation: **create**
5. Click **Analyze**
6. Review results - it shows exactly which ACL is blocking you

**Reference:**
- [ServiceNow ACL Troubleshooting Reference](https://www.servicenow.com/docs/bundle/xanadu-platform-security/page/administer/contextual-security/reference/r_ACLTroubleshoot.html)

### 2. Test Your Current Permissions

**Check what roles you currently have:**

Use the `get_user` tool:
```
get_user with:
- identifier: <your_username>
- fields: user_name,email,roles
```

**Check table access:**

Try querying the problematic table:
```
query_table with:
- table: cmdb_ci_service
- limit: 1
```

If query works but create fails, it's a write permission issue.

---

## Role Assignment Instructions for Admins

### How to Add Roles to a User

1. Navigate to **User Administration > Users**
2. Search for and open the user record
3. Scroll to **Roles** related list
4. Click **Edit**
5. Add required roles:
   - `itil`
   - `sn_cmdb_admin`
   - `service_viewer` ⭐ CRITICAL for services
   - `evt_mgmt_integration` (for events)
   - `evt_mgmt_admin` (for events)
6. Click **Save**

### Creating a Custom ACL (Workaround)

If existing ACLs cannot be modified, create a custom ACL:

1. Navigate to **System Security > Access Control (ACL)**
2. Click **New**
3. Fill in:
   - **Name:** `cmdb_ci_service`
   - **Operation:** `create` (or `write` for broader access)
   - **Type:** `record`
   - **Role:** Select your user's role or create new role
   - **Script:** Leave blank or add custom logic
   - **Active:** `true`
4. Click **Submit**

**Reference:**
- [ServiceNow Community - Create ACL for CMDB Access](https://www.servicenow.com/community/cmdb-forum/how-to-allow-a-user-create-acl-for-editing-alm-consumable-table/m-p/2847323)

---

## Testing Permissions

### Test Service Creation

Once permissions are configured, test with:

```
create_service with:
- name: "Test Service Permissions"
- description: "Testing CMDB service creation"
- service_classification: Technical Service
- business_criticality: 3
- operational_status: 1
```

**Expected Result:**
- ✅ Success: Service created with sys_id returned
- ❌ Failure: "Forbidden" or "Access Denied" error

### Test Event Creation

```
create_event with:
- source: "Test System"
- node: "test-server-01"
- description: "Testing event creation permissions"
- severity: 5
```

**Expected Result:**
- ✅ Success: Event created in `em_event` table
- ❌ Failure: Permission denied error

---

## Permission Best Practices

### For Development/Testing Environments

**Use `admin` role:**
- Full access to everything
- Simplifies testing
- Should ONLY be used in dev/test, never production

### For Production Environments

**Use principle of least privilege:**

**ITSM Operators (Read/Write):**
```
✅ itil                     - Standard operations
✅ sn_cmdb_user             - Basic CMDB access
✅ evt_mgmt_operator        - Event monitoring
```

**CMDB Administrators:**
```
✅ itil                     - Standard operations
✅ sn_cmdb_admin            - CMDB administration
✅ service_viewer           - Service management
✅ evt_mgmt_integration     - Event creation
```

**Read-Only Users:**
```
✅ itil_read_only          - Read-only ITSM
✅ sn_cmdb_user            - CMDB workspace access
✅ evt_mgmt_operator       - Event viewing
```

### Security Considerations

- **Never log credentials** in MCP server logs
- **Use environment variables** for sensitive configuration
- **Rotate credentials regularly**
- **Limit permissions** to only what's needed
- **Audit access** using ServiceNow security logs
- **Consider OAuth** instead of Basic Auth for production (future enhancement)

---

## Quick Troubleshooting Checklist

When a permission error occurs:

1. ✅ **Verify roles assigned:**
   - Check user has `itil`, `sn_cmdb_admin`, `service_viewer`
   - Use `get_user` tool to confirm roles

2. ✅ **Check table ACLs:**
   - Navigate to System Security > Access Control (ACL)
   - Search for table name and operation (create/write/delete)
   - Review any custom ACLs

3. ✅ **Use Access Analyzer:**
   - System Security > Access Analyzer
   - Test specific table and operation
   - Review results

4. ✅ **Check for plugins:**
   - DevOps Insights 1.36+ (known issue)
   - Custom CMDB security plugins
   - Review plugin-added ACLs

5. ✅ **Review policies:**
   - Data Policies (System Policy > Data Policies)
   - Business Rules (System Definition > Business Rules)
   - UI Policies (System UI > UI Policies)

6. ✅ **Test in isolation:**
   - Try creating record directly in ServiceNow UI
   - If UI works but API fails, it's an API-specific ACL issue
   - Check for REST API ACLs

---

## Additional Resources

### ServiceNow Documentation
- [Access Control List (ACL) Documentation](https://www.servicenow.com/docs/bundle/xanadu-platform-security/page/administer/contextual-security/reference/r_ACLTroubleshoot.html)
- [CMDB User Roles](https://www.servicenow.com/docs/)

### Community Resources
- [ServiceNow Community - CMDB Forum](https://www.servicenow.com/community/cmdb-forum/bd-p/cmdb-forum)
- [ServiceNow Community - Developer Forum](https://www.servicenow.com/community/developer-forum/bd-p/developer-forum)

### Support Articles
- [Fix ACL Permission Denied Issues](https://support.servicenow.com/kb?id=kb_article_view&sysparm_article=KB1117271)
- [CMDB Health Preferences Roles](https://support.servicenow.com/kb?id=kb_article_view&sysparm_article=KB0719151)

---

## Version History

**Last Updated:** 2026-02-04

**Changes:**
- Initial documentation based on ServiceNow MCP Server v1.2.0
- Added detailed permission requirements for all 19 tools
- Documented common permission issues and solutions
- Added troubleshooting guide with web research findings
- Included role variations for different ServiceNow versions

---

## Need Help?

If you continue to experience permission issues after following this guide:

1. **Check ServiceNow instance version** - Some role names vary by version
2. **Contact your ServiceNow administrator** - They can review ACLs and policies
3. **Use Access Analyzer** - Built-in tool to identify exact blocking permissions
4. **Review instance customizations** - Custom ACLs may override standard permissions
5. **Check ServiceNow Community** - Search for similar issues

**For MCP Server Issues:**
- Open an issue in the repository
- Include error message, roles assigned, and ServiceNow version
