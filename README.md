# ServiceNow MCP Server

A Node.js-based [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server that enables Claude Desktop and other MCP clients to interact with ServiceNow instances. Query tables, manage incidents, retrieve user information, and perform CRUD operations on any ServiceNow table.

## Features

- **8 Powerful Tools** for ServiceNow operations
- **2 Resources** providing instance metadata and common table information
- **Full CRUD Support** - Create, Read, Update, Delete records
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
      "args": [
        "/absolute/path/to/servicenow-mcp-server/dist/index.js"
      ],
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

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `SERVICENOW_INSTANCE` | Yes | ServiceNow instance URL | `https://dev12345.service-now.com` |
| `SERVICENOW_USERNAME` | Yes | ServiceNow username | `admin` |
| `SERVICENOW_PASSWORD` | Yes | ServiceNow password | `your-password` |
| `NAME` | Yes | Friendly instance name | `Production Instance` |
| `DEBUG` | No | Enable debug logging | `true` or `false` |

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

### Version 1.0.0
- Initial release
- 8 tools: query_table, get_record, search_incidents, get_user, create_record, update_record, get_table_schema, delete_record
- 2 resources: instance info, common tables
- Full TypeScript support
- Comprehensive error handling
- Basic Auth support
