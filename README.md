# GitHub Action: Output

GitHub Action for evaluating Bash shell expressions and storing the results in named outputs.
The invoked shell is currently hardcoded to `/bin/bash`.
In the future this might become configurable, detected by platform, or variable in some other way.

*Inputs:*

A dynamic mapping from output names to Bash expressions.
Each expression is to be evaluated and the result stored in the corresponding output name.
Note that "evaluated" does not mean a full command run by the shell:
The command is formed by passing the evaluated expression to `echo` as explained below.

*Outputs:*

An output is defined for each input and contains the result (stdout) of evaluating `echo -n "<expr>"`,
where `<expr>` is the input expression (with double quotes escaped).

The inputs are evaluated in separate shells in the order that they're defined.
The result of an evaluation named `<output>` is exposed to subsequent evaluations as the shell variable referenced as `$<output>`.

## Example workflow

The following workflow snippet defines a job `my_job` which simply runs the action to output a few computed values.

A subsequent step prints all the output values to illustrate how the outputs are accessed.

An additional job `my_dependent_job` is defined to illustrate how to access the outputs from other jobs
that `needs` the one containing the action.

The example uses the `ubuntu-latest` runner. The action also works on `macos` runners, but currently not `windows`.

```yaml
...
jobs:
  my_job:
    runs-on: ubuntu-latest
    outputs:
      repo-text: "${{steps.my_step.outputs.text}}"
    steps:
    - uses: bisgardo/output@v1
      id: my_step
      with:
        repo: "${{GITHUB_REPOSITORY}}"
        length: "${#repo}"
        text: "Repo '${repo}' has ${length} characters"
    - run: |
        echo "repo: ${{steps.my_step.outputs.repo}}"      # "repo: bisgardo/output"
        echo "length: ${{steps.my_step.outputs.length}}"  # "length: 15"
        echo "text: ${{steps.my_step.outputs.text}}"      # "text: Repo 'bisgardo/output' has 15 characters"

  my_dependent_job:
    runs-on: ubuntu-latest
    needs: my_job
    steps:
      - run: |
          echo "repo-text: ${{needs.my_job.outputs.repo-text}}"  # "repo-text: Repo 'bisgardo/output' has 15 characters"
```

The evaluated components are available in subsequent steps of the job `my_job` as the template variables

* `repo`: `${{steps.my_step.outputs.repo}}`
* `length`: `${{steps.my_step.outputs.length}}`
* `text`: `${{steps.my_step.outputs.text}}`

Since we declared the [`output`](https://docs.github.com/en/actions/using-jobs/defining-outputs-for-jobs) block in `my_job`,
one of the variables (`text`) is also exposed (as `repo-text`) to the dependent job `my_dependent_job`:

* `repo-text`: `${{needs.my_job.outputs.repo-text}}`
