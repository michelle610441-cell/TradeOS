# AI 分析 JSON schema 1.1

导出为完整分析快照。金额 CNY；数量单位股；百分比35表示35%。未知核心数值为 null。股票代码为字符串。

| 顶层字段 | 内容 |
|---|---|
| meta | schemaVersion、appVersion、exportId、tradeDate、exportedAt、timezone、session、dataAsOf、units、source、requestType |
| account | cash、totalEquity、totalPositionPct、availableCashPct、maxPositionPctToday、maxAcceptableLossPctToday |
| macro / trend / emotion | 原记录中的用户判断，排除界面标识 |
| market | userAssessment为用户原记录；asOf为行情截至时间；derived.volumeEnergy为软件按量能比值计算的缩量／平量／放量结果 |
| sectors | 当前软件已有的板块记录；不会生成未填写板块 |
| holdings | 持仓及股票ID、代码、交易所、数量、可卖数量、成本、记录价格、行情截至、前收、仓位、浮盈亏率、原始与当前计划、计划修改历史、最近AI建议 |
| watchlist | 所选交易日的候选股票与当前计划；可能包含已有持仓股票，通过stockId对应 |
| transactions | 当天账户流水，排除内部回滚快照 |
| closedTradeReviews | 手工录入的交易复盘，不能再与transactions相加作为两笔实际交易 |
| auxiliaryInformation | 当日机构、游资、博主记录 |
| userPlan | 市场预期、待执行动作、给AI的问题 |
| review | 当日复盘 |
| dataQuality | 缺失字段与数据解释 |

session枚举：pre_market、intraday、post_market。导出按钮要求选择时段。

量能状态：contracting（小于1，缩量）、flat（等于1，平量）、expanding（大于1，放量）、unknown（未填写）。该结果不擅自覆盖用户最终市场判断。

exportedAt为真实导出时刻；dataAsOf和各价格的priceAsOf来自手工填写，不能用导出时间替代行情时间。日期时间包含时区。

原始持仓计划缺失时 originalPlan=null。新建仓原始计划包含 capturedAt，之后加仓不会覆盖。当前计划和修改历史独立存储。

AI建议是用户手动粘贴记录，状态可能为未采纳、已采纳、已失效；不代表已执行交易。
