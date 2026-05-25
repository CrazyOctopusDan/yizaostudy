# Study Task Postpone and Self-Check Design

## Goal

Make daily study actions harder to misread: today tasks can be postponed but not canceled, textbook tree status can be explicitly reverted, and `模糊` / `掌握` actions show self-check prompts before the learner confirms the status.

## Interaction Semantics

- Today knowledge tasks show `已学`、`模糊`、`掌握`、`推迟`.
- `推迟` marks only the current dated task as postponed. It does not change the knowledge point, does not award EXP, and does not remove the knowledge point from the textbook tree.
- Textbook tree actions show `已学`、`模糊`、`掌握`、`撤销标记`.
- `撤销标记` resets the knowledge point to `未开始` for mistaken status clicks. It is not a study-plan skip.
- Existing completed or fuzzy points remain visible in the tree and review feedback.

## Self-Check Prompts

Before confirming `模糊`, the app shows a short self-check dialog that asks whether the learner can locate the chapter/section, explain the purpose, distinguish adjacent concepts, identify likely question style, and name the unclear sentence/formula/rule.

Before confirming `掌握`, the app shows a retrieval-practice dialog that asks the learner to explain the core definition without looking, state application conditions or calculation path, give a real造价 work scenario, name a common trap, and connect the point to case-analysis when applicable.

Prompt wording varies by subject:

- 管理:制度、流程、合同、项目管理逻辑。
- 计价:费用构成、计价依据、清单、合同价款调整、结算。
- 土建计量:构造、材料、施工技术、工程量计算规则。
- 案例:解题步骤、数据提取、公式选择、书面表达、时间控制。

The dialog does not grade answers. The learner reads the prompts, does the recall check, then chooses whether to confirm or return.

## Testing

Automated tests cover postponing a today task without mutating knowledge status or EXP. Frontend smoke checks cover the dialog copy and button labels.
