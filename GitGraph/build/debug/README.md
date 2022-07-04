# LibGitGraph
Git grapth visualization API for AntOS application.

The visualization can be easily integrated to an AntOS application, example:

```typescript
const graph = new API.LibGitGraph({
    target: this.find("git-graph")
});
graph.on_open_diff = (files) => {
    console.log(files);
}
graph.base_dir = "home://workspace/repo-git";
```

## Change logs:
- v0.1.0-b: Initial version