# LibGitGraph
Git grapth visualization API for AntOS application.

The visualization can be easily integrated to an AntOS application, example:

```typescript
const graph = new API.LibGitGraph({
    target: this.find("git-graph");
});
graph.on_open_diff = (files) => {
    console.log(files);
}
graph.base_dir = "home://workspace/repo-git".asFileHandle();
```

## Change logs:
- v0.1.5-b: Adapt to new AntOS UI API
- v0.1.4-b: Fetch changes on a commit based on current commit and its left most parent commit
- v0.1.3-b: Support open Git repo with open with dialog
- v0.1.2-b: fix init bug
- v0.1.1-b: add class to container element
- v0.1.0-b: Initial version