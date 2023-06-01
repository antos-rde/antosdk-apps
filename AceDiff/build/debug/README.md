# AceDiff
This is a wrapper for Ace Editor to provide a 2-panel diffing/merging tool that visualizes differences in two documents and allows users to copy changes from to the other.

It's built on top of google-diff-match-patch library. That lib handles the hard part: the computation of the document diffs. Ace-diff just visualizes that information as line-diffs in the editors.

Github page: [https://github.com/ace-diff/ace-diff](https://github.com/ace-diff/ace-diff).

The ACE diff depends on the ACECore package.

## Change logs
- v0.1.1-a: add dependencies