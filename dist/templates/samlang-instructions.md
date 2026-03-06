# SAMlang Quick Reference

## MCP Tools
| Tool | Purpose |
|------|---------|
| sl_spec | Load full protocol (subagents call first) |
| sl_file | Register file path -> get $N alias |
| sl_alias | Register custom alias for any string |
| sl_compress | Compress verbose text |
| sl_decompress | Expand compressed text |
| sl_stats | Show token savings |
| sl_dict | Show all active aliases |
| sl_reset | Clear session data |

## Status Codes
`+` created | `-` removed | `~` modified | `!` error | `?` need info | `#N` count | `d` done | `ok` success

## Path Shortcuts
`~` home | `.` cwd | `^` parent | `~s` src | `~d` dist | `~n` node_modules

## File References
`$0` first file | `$1` second | `$N:L` line L of file N | `$N:L1-L2` range

## Bash Shortcuts
`gs` git status | `gd` git diff | `gc` git commit | `ni` npm install | `nr` npm run | `nb` npm run build
