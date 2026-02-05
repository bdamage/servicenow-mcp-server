# FOR DEMO INSTANCE USE ONLY

# ServiceNow MCP Server

A Node.js-based [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server that enables Claude Desktop and other MCP clients to interact with ServiceNow instances. Query tables, manage incidents, retrieve user information, and perform CRUD operations on any ServiceNow table.

## Features

- **22 Powerful Tools** for comprehensive ServiceNow operations
- **2 Resources** providing instance metadata and common table information
- **Full CRUD Support** - Create, Read, Update, Delete records
- **Batch Operations** - Create, update, or query multiple records in parallel
- **CMDB Management** - Advanced CI relationships, impact analysis, and topology mapping
- **IRE Integration** - Best-practice CMDB data imports with duplicate prevention and reconciliation
- **Event Management** - Create and query events for monitoring and alerting
- **Service Modeling** - Define business services with criticality and link to CIs
- **Impact Analysis** - Assess outage impact on services and dependencies
- **Incident Management** - Specialized tools for searching and managing incidents
- **User Management** - Query user information by username or sys_id
- **Schema Discovery** - Explore table structures and available fields
- **Type-Safe** - Built with TypeScript for reliability
- **Easy Configuration** - Simple environment variable setup

## Installation

### Prerequisites

- Node.js 18+ and npm
- A ServiceNow instance with API access
- ServiceNow credentials (username and password)
- Claude Desktop or another MCP client

### Setup

1. **Clone or download this repository**

```bash
cd /path/to/servicenow-mcp-server
```

2. **Install dependencies**

```bash
npm install
```

3. **Build the project**

```bash
npm run build
```

This will compile TypeScript to JavaScript in the `dist/` directory.

## Configuration

### Claude Desktop Configuration

Add the server to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "servicenow": {
      "command": "node",
      "args": ["/absolute/path/to/servicenow-mcp-server/dist/index.js"],
      "env": {
        "SERVICENOW_INSTANCE": "https://your-instance.service-now.com",
        "SERVICENOW_USERNAME": "admin",
        "SERVICENOW_PASSWORD": "your-password",
        "NAME": "Production Instance"
      }
    }
  }
}
```

**Important**: Replace the placeholder values with your actual ServiceNow credentials:

- `SERVICENOW_INSTANCE`: Your ServiceNow instance URL (e.g., `https://dev12345.service-now.com`)
- `SERVICENOW_USERNAME`: ServiceNow username with API access
- `SERVICENOW_PASSWORD`: Password for the ServiceNow user
- `NAME`: A friendly name for this instance (e.g., "Production", "Development")

### Environment Variables

| Variable              | Required | Description             | Example                            |
| --------------------- | -------- | ----------------------- | ---------------------------------- |
| `SERVICENOW_INSTANCE` | Yes      | ServiceNow instance URL | `https://dev12345.service-now.com` |
| `SERVICENOW_USERNAME` | Yes      | ServiceNow username     | `admin`                            |
| `SERVICENOW_PASSWORD` | Yes      | ServiceNow password     | `your-password`                    |
| `NAME`                | Yes      | Friendly instance name  | `Production Instance`              |
| `DEBUG`               | No       | Enable debug logging    | `true` or `false`                  |

## Available Tools

### 1. query_table

Query any ServiceNow table with filters, pagination, and field selection.

**Parameters:**

- `table` (required): Table name (e.g., "incident", "sys_user")
- `query` (optional): Encoded query string (e.g., "active=true^priority=1")
- `fields` (optional): Comma-separated field list (e.g., "number,short_description,priority")
- `limit` (optional): Max records to return (default: 100, max: 1000)
- `offset` (optional): Pagination offset (default: 0)

**Example:**

```
Query the incident table for active high-priority incidents:
- table: incident
- query: active=true^priority=1
- fields: number,short_description,state,assigned_to
- limit: 50
```

### 2. get_record

Retrieve a single ServiceNow record by its sys_id.

**Parameters:**

- `table` (required): Table name
- `sys_id` (required): 32-character hexadecimal sys_id
- `fields` (optional): Fields to return

**Example:**

```
Get a specific incident:
- table: incident
- sys_id: 9d385017c611228701d22104cc95c371
- fields: number,short_description,priority,state
```

### 3. search_incidents

Specialized tool for searching incidents with common filters.

**Parameters:**

- `status` (optional): Incident state (1=New, 2=In Progress, 6=Resolved, 7=Closed)
- `priority` (optional): Priority level (1=Critical, 2=High, 3=Moderate, 4=Low, 5=Planning)
- `assigned_to` (optional): Username of assigned user
- `assignment_group` (optional): Name of assignment group
- `search_text` (optional): Text to search in short_description or description
- `limit` (optional): Max records (default: 100)
- `offset` (optional): Pagination offset (default: 0)

**Example:**

```
Find all critical incidents assigned to a specific group:
- priority: 1
- assignment_group: Network Team
- status: 2
```

### 4. get_user

Retrieve user information by username or sys_id.

**Parameters:**

- `identifier` (required): Username (e.g., "admin") or sys_id
- `fields` (optional): Fields to return

**Example:**

```
Get user details:
- identifier: john.doe
- fields: user_name,first_name,last_name,email,title
```

### 5. create_record

Create a new record in any ServiceNow table.

**Parameters:**

- `table` (required): Table name
- `data` (required): Record data as key-value pairs

**Example:**

```
Create a new incident:
- table: incident
- data: {
    "short_description": "Database server is down",
    "priority": "1",
    "caller_id": "admin",
    "assignment_group": "Database Team"
  }
```

### 6. update_record

Update an existing ServiceNow record by sys_id.

**Parameters:**

- `table` (required): Table name
- `sys_id` (required): Record sys_id to update
- `data` (required): Fields to update

**Example:**

```
Update incident status:
- table: incident
- sys_id: 9d385017c611228701d22104cc95c371
- data: {
    "state": "6",
    "close_notes": "Issue resolved by restarting service"
  }
```

### 7. get_table_schema

Get the structure and available fields of a ServiceNow table.

**Parameters:**

- `table` (required): Table name

**Example:**

```
Get schema for incident table:
- table: incident
```

### 8. delete_record

Delete a ServiceNow record by sys_id. **Use with caution** - this cannot be undone.

**Parameters:**

- `table` (required): Table name
- `sys_id` (required): Record sys_id to delete

**Example:**

```
Delete a test incident:
- table: incident
- sys_id: abc123def456789012345678901234567
```

### 9. batch_create_records

Create multiple records in a single batch operation. Records are created in parallel for better performance.

**Parameters:**

- `table` (required): Table name
- `records` (required): Array of record data objects (max 100)

**Example:**

```
Create multiple incidents at once:
- table: incident
- records: [
    {
      "short_description": "Email server down",
      "priority": "1",
      "caller_id": "admin"
    },
    {
      "short_description": "Printer not working",
      "priority": "3",
      "caller_id": "admin"
    },
    {
      "short_description": "Database slow performance",
      "priority": "2",
      "caller_id": "admin"
    }
  ]
```

**Returns:**

- Total records processed
- Successfully created records
- Failed records with error details

### 10. batch_update_records

Update multiple records in a single batch operation. Updates are executed in parallel for better performance.

**Parameters:**

- `table` (required): Table name
- `updates` (required): Array of update operations (max 100)
  - Each operation contains:
    - `sys_id` (required): Record to update
    - `data` (required): Fields to update

**Example:**

```
Update multiple incidents to resolved:
- table: incident
- updates: [
    {
      "sys_id": "abc123...",
      "data": {
        "state": "6",
        "close_notes": "Fixed by restart"
      }
    },
    {
      "sys_id": "def456...",
      "data": {
        "state": "6",
        "close_notes": "User error resolved"
      }
    }
  ]
```

**Returns:**

- Total records processed
- Successfully updated records
- Failed records with error details

### 11. batch_query_tables

Query multiple tables in a single batch operation. Queries are executed in parallel for better performance. Useful for gathering related data from different tables simultaneously.

**Parameters:**

- `queries` (required): Array of query operations (max 20)
  - Each query contains:
    - `table` (required): Table name
    - `query` (optional): Encoded query string
    - `fields` (optional): Fields to return
    - `limit` (optional): Max records (default: 100)
    - `offset` (optional): Pagination offset (default: 0)

**Example:**

```
Query incidents and users at the same time:
- queries: [
    {
      "table": "incident",
      "query": "active=true^priority=1",
      "fields": "number,short_description,state",
      "limit": 50
    },
    {
      "table": "sys_user",
      "query": "active=true",
      "fields": "user_name,email,title",
      "limit": 100
    },
    {
      "table": "change_request",
      "query": "state=1",
      "limit": 20
    }
  ]
```

**Returns:**

- Total queries processed
- Results for each successful query (table name, count, records)
- Failed queries with error details

### 12. get_ci_relationships

Get all relationships for a Configuration Item from the CMDB. Shows parent, child, or all relationships with details about related CIs.

**Parameters:**

- `ci_sys_id` (required): The sys_id of the Configuration Item
- `relationship_type` (optional): Type of relationships to retrieve - "parent", "child", or "all" (default: "all")
- `depth` (optional): Depth of relationship traversal 1-3 (default: 1)

**Example:**

```
Get all relationships for a database server:
- ci_sys_id: abc123def456789012345678901234567
- relationship_type: all
- depth: 2
```

**Returns:**

- CI details (name, class, status)
- All relationships with type information
- Related CIs with their details

### 13. get_impact_analysis

Analyze the potential impact of a CI outage on dependent services and configuration items. Provides risk assessment and identifies critical affected services.

**Parameters:**

- `ci_sys_id` (required): The sys_id of the Configuration Item to analyze
- `include_services` (optional): Include affected business services (default: true)
- `max_depth` (optional): Maximum depth of dependency traversal 1-5 (default: 3)

**Example:**

```
Analyze impact of database server outage:
- ci_sys_id: abc123def456789012345678901234567
- include_services: true
- max_depth: 3
```

**Returns:**

- Source CI details
- Impact summary (total affected CIs, critical services, risk level)
- List of affected CIs and services
- Dependency chain
- Risk assessment (HIGH/MEDIUM/LOW)

### 14. query_cmdb_ci

Query Configuration Items from the CMDB with advanced filtering by class, status, environment, and support group.

**Parameters:**

- `ci_class` (optional): CI class name (e.g., "cmdb_ci_server", "cmdb_ci_database")
- `name_contains` (optional): Search for CIs with names containing this text
- `operational_status` (optional): Operational status (1=Operational, 2=Non-Operational, etc.)
- `environment` (optional): Environment (e.g., "Production", "Development", "Test")
- `support_group` (optional): Name of the support group
- `custom_query` (optional): Additional encoded query string
- `fields` (optional): Comma-separated field list
- `limit` (optional): Max records (default: 100)
- `offset` (optional): Pagination offset (default: 0)

**Example:**

```
Find all production database servers:
- ci_class: cmdb_ci_database
- environment: Production
- operational_status: 1
- limit: 50
```

**Returns:**

- Count of CIs found
- Array of Configuration Items with requested fields

### 15. create_event

Create an event in ServiceNow Event Management for monitoring, alerting, and automated incident creation. Events can trigger alerts and automation workflows.

**Parameters:**

- `source` (required): Event source system (e.g., "Nagios", "Splunk", "Custom Monitor")
- `node` (required): Source node/host name (e.g., "webserver01.company.com")
- `description` (required): Event description/message
- `type` (optional): Event type (e.g., "CPU", "Disk", "Memory", "Network")
- `resource` (optional): Affected resource (e.g., "CPU Core 1", "/dev/sda1")
- `severity` (optional): Severity 0=Clear, 1=Critical, 2=Major, 3=Minor, 4=Warning, 5=Info (default: 3)
- `message_key` (optional): Unique message key for event correlation
- `additional_info` (optional): Additional context or details (JSON string supported)
- `ci_identifier` (optional): CI identifier to link event to a Configuration Item
- `metric_name` (optional): Metric name (e.g., "cpu_utilization", "disk_usage")
- `metric_value` (optional): Metric value (e.g., "95%", "450ms")

**Example:**

```
Create a critical CPU alert:
- source: Nagios
- node: webserver01.company.com
- type: CPU
- severity: 1
- description: CPU utilization exceeded threshold
- metric_name: cpu_utilization
- metric_value: 98%
```

**Returns:**

- Event sys_id
- Complete event record
- Processing status message

### 16. query_events

Query Event Management events with filtering by source, node, severity, and time range. Includes statistics on event distribution.

**Parameters:**

- `source` (optional): Filter by event source system
- `node` (optional): Filter by source node/host name
- `severity` (optional): Filter by severity (0-5)
- `state` (optional): Filter by processing state (Ready, Queued, Processing, Processed, Error)
- `time_range_hours` (optional): Only show events from the last N hours (1-168, max 1 week)
- `custom_query` (optional): Additional encoded query string
- `limit` (optional): Max records (default: 100)
- `offset` (optional): Pagination offset (default: 0)

**Example:**

```
Get all critical events from the last 24 hours:
- severity: 1
- time_range_hours: 24
- limit: 100
```

**Returns:**

- Event count
- Statistics (by severity and state)
- Array of events ordered by creation time

### 17. create_service

Create a business or technical service in the CMDB with criticality, classification, and ownership. Services can be linked to CIs and service offerings.

**Parameters:**

- `name` (required): Service name
- `description` (optional): Service description
- `service_classification` (optional): "Business Service", "Technical Service", "Service Offering", "Application Service" (default: "Business Service")
- `business_criticality` (optional): 1=Mission Critical, 2=High, 3=Medium, 4=Low, 5=Planning (default: 3)
- `operational_status` (optional): 1=Operational, 2=Non-Operational, etc. (default: 1)
- `owned_by` (optional): sys_id of service owner
- `managed_by` (optional): sys_id of managing group
- `parent_service` (optional): sys_id of parent service (for service hierarchies)
- `service_owner` (optional): Username or sys_id of service owner
- `support_group` (optional): Name of support group responsible for this service
- `used_for` (optional): "Production", "Staging", "QA", "Development", "Disaster Recovery"
- `version` (optional): Service version

**Example:**

```
Create a mission-critical e-commerce service:
- name: E-Commerce Platform
- description: Customer-facing online store
- service_classification: Business Service
- business_criticality: 1
- operational_status: 1
- support_group: E-Commerce Team
- used_for: Production
```

**Returns:**

- Service sys_id
- Complete service record
- Success message

### 18. link_ci_to_service

Create a relationship between a Configuration Item and a Service in the CMDB. This defines service dependencies on infrastructure.

**Parameters:**

- `service_sys_id` (required): sys_id of the service
- `ci_sys_id` (required): sys_id of the Configuration Item to link
- `relationship_type` (optional): Relationship type (default: "Depends On::Used By")

**Example:**

```
Link a database server to the e-commerce service:
- service_sys_id: service123abc456def789012345678901
- ci_sys_id: ci123abc456def789012345678901234
- relationship_type: Depends On::Used By
```

**Returns:**

- Relationship sys_id
- Service details (name, criticality)
- CI details (name, class)
- Success message

### 19. get_service_map

Get complete service topology including all related CIs, child services, dependencies, criticality assessment, and health metrics. Visualizes service architecture.

**Parameters:**

- `service_sys_id` (required): sys_id of the service to map
- `include_child_services` (optional): Include child services in the map (default: true)
- `max_depth` (optional): Maximum depth of service hierarchy to traverse 1-5 (default: 3)

**Example:**

```
Get complete topology for e-commerce service:
- service_sys_id: service123abc456def789012345678901
- include_child_services: true
- max_depth: 3
```

**Returns:**

- Service details (name, classification, criticality, owner)
- Topology summary (total CIs, health percentage, CIs by class)
- Related CIs with details
- Child services
- Relationships
- Risk assessment (HIGH/MEDIUM/LOW with reasoning)

### 20. ire_create_or_update_ci

Create or update a single Configuration Item using ServiceNow's Identification and Reconciliation Engine (IRE). IRE provides intelligent CMDB data management with automatic duplicate detection, identification rules, and reconciliation.

**Why use IRE instead of create_record?**
- **Automatic Duplicate Prevention**: Uses identification rules to find existing CIs
- **Intelligent Reconciliation**: Merges data from multiple sources based on precedence
- **Data Quality**: Enforces standardized CMDB import process
- **Source Tracking**: Tracks data origin for audit and reconciliation

**Prerequisites:**
- Data source must be configured in ServiceNow's `discovery_source` table
- Identification rules should be configured for CI class (optional but recommended)
- Use `ire_list_data_sources` to see available sources

**Parameters:**

- `data_source` (required): Discovery source name (e.g., "MyDiscoveryTool")
- `class_name` (required): CI class name starting with "cmdb_ci" (e.g., "cmdb_ci_server")
- `values` (required): CI attributes as key-value pairs
- `internal_id` (optional): Unique identifier from source system (recommended for tracking)
- `relations` (optional): CI relationship definitions
- `reference_items` (optional): Reference field data (advanced)

**Example:**

```
Create or update a server CI:
- data_source: MyDiscoverySource
- class_name: cmdb_ci_server
- values: {"name": "srv-web-01", "ip_address": "10.0.1.50", "host_name": "srv-web-01.example.com", "os_name": "Red Hat Enterprise Linux"}
- internal_id: aws-i-1234567890abcdef
```

**Returns:**

- Operation status: "created", "updated", "identified", "skipped", or "error"
- CI sys_id
- CI identifier
- Status message
- Error details (if applicable)

### 21. ire_batch_create_or_update_cis

Batch create or update multiple Configuration Items (up to 100) using IRE in a single operation. Ideal for bulk imports and synchronization.

**Parameters:**

- `data_source` (required): Discovery source name
- `items` (required, 1-100): Array of CI definitions, each containing:
  - `className`: CI class name
  - `values`: CI attributes
  - `internal_id`: Unique identifier (optional)
  - `relations`: CI relationships (optional)
  - `referenceItems`: Reference data (optional)

**Example:**

```
Import 3 servers from discovery:
- data_source: MyDiscoverySource
- items: [
    {
      "className": "cmdb_ci_server",
      "values": {"name": "srv-web-01", "ip_address": "10.0.1.50"}
    },
    {
      "className": "cmdb_ci_server",
      "values": {"name": "srv-web-02", "ip_address": "10.0.1.51"}
    },
    {
      "className": "cmdb_ci_database",
      "values": {"name": "db-prod-01", "ip_address": "10.0.2.10"}
    }
  ]
```

**Returns:**

- Total, created, updated, identified, skipped, and failed counts
- Per-CI results with operation status and sys_id
- Detailed error information for failures
- Summary message

### 22. ire_list_data_sources

List available discovery data sources configured in ServiceNow for use with IRE operations.

**Parameters:**

- `active_only` (optional): Show only active data sources (default: true)

**Example:**

```
List all active data sources:
- active_only: true
```

**Returns:**

- Count of data sources
- Array of sources with:
  - Name
  - Label
  - Active status
  - Type

## IRE (Identification and Reconciliation Engine) Overview

The IRE tools (`ire_create_or_update_ci`, `ire_batch_create_or_update_cis`, `ire_list_data_sources`) provide best-practice CMDB data integration:

**Key Benefits:**
- **Duplicate Prevention**: Automatically identifies existing CIs using configured identification rules
- **Data Reconciliation**: Intelligently merges data from multiple sources
- **Source Management**: Tracks data origin and applies source precedence rules
- **Data Quality**: Enforces validation and standardized import processes
- **Relationship Handling**: Manages CI dependencies and relationships

**When to Use IRE vs Direct Table Operations:**

| Use Case | Recommended Tool | Reason |
|----------|-----------------|--------|
| Importing from external systems | IRE tools | Prevents duplicates, tracks sources |
| Discovery tool integration | IRE tools | Handles reconciliation automatically |
| One-time manual CI creation | `create_record` | Simpler for ad-hoc tasks |
| Bulk data synchronization | `ire_batch_create_or_update_cis` | Efficient, prevents duplicates |
| Updating known CI by sys_id | `update_record` | Direct update when sys_id is known |

**Prerequisites:**
1. **Data Sources**: Configure in ServiceNow at System Definition > Discovery Sources
2. **Identification Rules**: Set up at CMDB > Configuration > Identification Rules (defines how to match CIs)
3. **Reconciliation Rules**: Configure at CMDB > Configuration > Reconciliation Rules (defines data precedence)

## Available Resources

### 1. servicenow://instance/info

Provides metadata about the connected ServiceNow instance including instance URL, name, and API version.

### 2. servicenow://tables/common

Lists frequently used ServiceNow tables with their descriptions and primary fields. Includes:

- incident
- sys_user
- sys_user_group
- change_request
- problem
- cmdb_ci
- kb_knowledge
- task
- sc_request
- sc_req_item

## Usage Examples

### Query Incidents

Ask Claude:

```
Show me all critical incidents that are currently in progress
```

Claude will use the `search_incidents` tool with:

```json
{
  "priority": "1",
  "status": "2"
}
```

### Create an Incident

Ask Claude:

```
Create a new incident: "Email server is not responding" with high priority
```

Claude will use the `create_record` tool:

```json
{
  "table": "incident",
  "data": {
    "short_description": "Email server is not responding",
    "priority": "2"
  }
}
```

### Explore Table Structure

Ask Claude:

```
What fields are available in the change_request table?
```

Claude will use the `get_table_schema` tool:

```json
{
  "table": "change_request"
}
```

### Batch Create Multiple Incidents

Ask Claude:

```
Create 5 incidents for different network issues: router offline, switch failure,
firewall error, DNS not responding, and VPN connection lost. All should be high priority.
```

Claude will use the `batch_create_records` tool:

```json
{
  "table": "incident",
  "records": [
    {
      "short_description": "Router offline in Building A",
      "priority": "2"
    },
    {
      "short_description": "Network switch failure",
      "priority": "2"
    },
    {
      "short_description": "Firewall error detected",
      "priority": "2"
    },
    {
      "short_description": "DNS not responding",
      "priority": "2"
    },
    {
      "short_description": "VPN connection lost",
      "priority": "2"
    }
  ]
}
```

### Batch Update Multiple Records

Ask Claude:

```
Close all the incidents I just created with a note saying "Issue resolved"
```

Claude will use the `batch_update_records` tool:

```json
{
  "table": "incident",
  "updates": [
    {
      "sys_id": "abc123...",
      "data": {
        "state": "6",
        "close_notes": "Issue resolved"
      }
    },
    {
      "sys_id": "def456...",
      "data": {
        "state": "6",
        "close_notes": "Issue resolved"
      }
    }
  ]
}
```

### Query Multiple Tables at Once

Ask Claude:

```
Show me active incidents, current change requests, and all database team members
```

Claude will use the `batch_query_tables` tool:

```json
{
  "queries": [
    {
      "table": "incident",
      "query": "active=true",
      "limit": 50
    },
    {
      "table": "change_request",
      "query": "state=1",
      "limit": 50
    },
    {
      "table": "sys_user",
      "query": "department.name=Database Team^active=true",
      "fields": "user_name,email,title"
    }
  ]
}
```

## ServiceNow Query Syntax

When using the `query` parameter, use ServiceNow's encoded query syntax:

- **Equals**: `field=value`
- **AND**: `^` (e.g., `active=true^priority=1`)
- **OR**: `^OR` (e.g., `priority=1^ORpriority=2`)
- **Not equals**: `field!=value`
- **Greater than**: `field>value`
- **Less than**: `field<value`
- **Contains**: `fieldLIKEvalue`
- **Starts with**: `fieldSTARTSWITHvalue`

**Examples:**

- Active high-priority incidents: `active=true^priority=1`
- Incidents assigned to user: `assigned_to.user_name=john.doe`
- Multiple states: `state=2^ORstate=3`

## Troubleshooting

### Authentication Errors

If you see "Authentication failed" errors:

1. Verify your `SERVICENOW_USERNAME` and `SERVICENOW_PASSWORD` are correct
2. Check that the user has API access permissions in ServiceNow
3. Ensure the instance URL is correct (include `https://`)

### Connection Errors

If you see "Could not connect to ServiceNow" errors:

1. Verify the `SERVICENOW_INSTANCE` URL is correct
2. Check your network connection
3. Ensure your ServiceNow instance is accessible
4. Verify there are no firewall restrictions

### Permission Errors

If you see "Forbidden" errors:

1. Check that your ServiceNow user has the necessary table permissions
2. Verify the user has the appropriate roles (e.g., `itil`, `admin`)
3. Check ACL rules in ServiceNow for the specific table

### Build Errors

If `npm run build` fails:

1. Ensure you're using Node.js 18 or higher
2. Delete `node_modules` and run `npm install` again
3. Check for TypeScript errors in the output

## Development

### Project Structure

```
servicenow-mcp-server/
├── src/
│   ├── index.ts                    # Main MCP server entry point
│   ├── config.ts                   # Environment configuration
│   ├── servicenow/
│   │   ├── client.ts              # ServiceNow API client
│   │   ├── auth.ts                # Authentication
│   │   └── types.ts               # TypeScript types
│   ├── tools/                      # MCP tool implementations
│   ├── resources/                  # MCP resource implementations
│   └── utils/                      # Utilities (logger, validation, errors)
├── dist/                           # Compiled JavaScript (generated)
├── package.json
├── tsconfig.json
└── README.md
```

### Building

```bash
# Build once
npm run build

# Watch mode (rebuild on changes)
npm run watch
```

### Running Locally

```bash
# Build and run
npm run dev
```

### Adding New Tools

1. Create a new file in `src/tools/` (e.g., `my-tool.ts`)
2. Implement the tool following the pattern in existing tools
3. Export the tool from `src/tools/index.ts`
4. Register the tool in `src/index.ts` (ListTools and CallTool handlers)

## Security Considerations

- **Never commit credentials** to version control
- Use environment variables for all sensitive configuration
- Consider using OAuth instead of Basic Auth for production environments
- Limit ServiceNow user permissions to only what's necessary
- Use read-only accounts when possible for query-only operations
- Regularly rotate ServiceNow credentials

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

MIT

## Support

For issues related to:

- **This MCP server**: Open an issue in this repository
- **ServiceNow API**: Consult [ServiceNow REST API documentation](https://docs.servicenow.com/bundle/xanadu-api-reference/page/integrate/inbound-rest/concept/c_RESTAPI.html)
- **Claude Desktop**: Visit [Claude Desktop documentation](https://claude.ai/desktop)
- **MCP Protocol**: Visit [Model Context Protocol documentation](https://modelcontextprotocol.io)

## Changelog

### Version 1.2.0

- Added advanced CMDB operations (3 tools)
  - `get_ci_relationships`: Explore CI relationships and dependencies
  - `get_impact_analysis`: Assess outage impact on services and CIs
  - `query_cmdb_ci`: Advanced CI queries with filtering
- Added Event Management support (2 tools)
  - `create_event`: Create events for monitoring and alerting
  - `query_events`: Query events with statistics
- Added Service Modeling capabilities (3 tools)
  - `create_service`: Define business/technical services with criticality
  - `link_ci_to_service`: Link CIs to services for dependency mapping
  - `get_service_map`: Visualize service topology with health metrics
- Added IRE (Identification and Reconciliation Engine) support (3 tools)
  - `ire_create_or_update_ci`: Create/update CIs with duplicate prevention
  - `ire_batch_create_or_update_cis`: Batch CI operations with IRE (up to 100)
  - `ire_list_data_sources`: List configured discovery data sources
- Total of 22 tools available (8 basic + 3 batch + 3 CMDB + 2 events + 3 services + 3 IRE)
- Best-practice CMDB data integration with automatic duplicate detection
- Intelligent data reconciliation from multiple sources
- Enhanced service management with criticality levels and impact analysis
- Comprehensive event correlation and alerting support

### Version 1.1.0

- Added batch operations for improved performance
- 3 new tools: batch_create_records, batch_update_records, batch_query_tables
- Batch operations execute in parallel for 5-10x performance improvement
- Support for up to 100 records per batch create/update operation
- Support for up to 20 queries per batch query operation
- Comprehensive error reporting for batch operations (identifies which records succeeded/failed)

### Version 1.0.0

- Initial release
- 8 tools: query_table, get_record, search_incidents, get_user, create_record, update_record, get_table_schema, delete_record
- 2 resources: instance info, common tables
- Full TypeScript support
- Comprehensive error handling
- Basic Auth support
