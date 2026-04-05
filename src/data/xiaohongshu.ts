export type XhsPage = {
  fileName: string;
  prompt: string;
  templateId: string;
  values: Record<string, string>;
};

export type XhsCampaign = {
  id: string;
  name: string;
  note: string;
  pages: XhsPage[];
};

export const xiaohongshuCampaigns: XhsCampaign[] = [
  {
    id: "launch",
    name: "套图 A：首发介绍",
    note: "适合第一次发产品介绍，先建立认知。",
    pages: [
      {
        fileName: "xhs-launch-01.svg",
        prompt: "首发介绍第 1 页封面",
        templateId: "cover-hero",
        values: {
          eyebrow: "小龙虾安装器",
          title: "不会命令行 也能装 OpenClaw",
          subtitle: "安装 + 配置 + 插件接入，一个桌面应用搞定",
          highlight: "先把第一次装起来这件事，变得更轻松一点",
          featureA: "环境检测",
          featureADesc: "先看本机状态",
          featureB: "配置入口",
          featureBDesc: "模型 / 渠道 / 工作区",
          featureC: "插件接入",
          featureCDesc: "一步步看状态"
        }
      },
      {
        fileName: "xhs-launch-02.svg",
        prompt: "首发介绍第 2 页解释定位",
        templateId: "story-split",
        values: {
          eyebrow: "它是什么",
          title: "它不是 OpenClaw 本体",
          subtitle: "更像一个把安装和配置收起来的桌面工作台",
          leftLabel: "以前",
          leftTitle: "命令行 + JSON + 文档",
          leftBody: "看安装说明 切终端 找配置文件 插插件 每一步都可能漏掉",
          rightLabel: "现在",
          rightTitle: "图形界面 + 检测 + 入口",
          rightBody: "打开应用 先看状态 再点安装 最后在界面里把高频配置填完",
          footer: "不是替代能力，而是把复杂流程换成更友好的入口"
        }
      },
      {
        fileName: "xhs-launch-03.svg",
        prompt: "首发介绍第 3 页痛点",
        templateId: "triple-cards",
        values: {
          eyebrow: "主要问题",
          title: "主要解决什么问题",
          subtitle: "很多人不是不会用 AI，而是不想在安装阶段就被劝退",
          cardA: "安装难",
          cardAL1: "先看环境",
          cardAL2: "再装 CLI",
          cardAL3: "中间很容易断",
          cardB: "配置散",
          cardBL1: "模型入口",
          cardBL2: "workspace 路径",
          cardBL3: "分散在不同位置",
          cardC: "接入烦",
          cardCL1: "插件文档长",
          cardCL2: "状态不清楚",
          cardCL3: "排错成本高",
          footer: "把第一次装机流程收拢好，传播会顺很多"
        }
      },
      {
        fileName: "xhs-launch-04.svg",
        prompt: "首发介绍第 4 页功能清单",
        templateId: "step-list",
        values: {
          eyebrow: "现在能做",
          title: "现在能做什么",
          subtitle: "把安装和常用配置放进同一个清晰入口",
          step1: "环境检测",
          step2: "安装与更新",
          step3: "模型配置",
          step4: "插件接入",
          step5: "workspace 管理",
          footer: "一张图先说清能力范围，比堆界面截图更有效"
        }
      },
      {
        fileName: "xhs-launch-05.svg",
        prompt: "首发介绍第 5 页适合谁",
        templateId: "triple-cards",
        values: {
          eyebrow: "适合谁",
          title: "这套入口更适合哪些人",
          subtitle: "不是只给工程师准备，而是给想更顺手装起来的人",
          cardA: "新手用户",
          cardAL1: "不想碰终端",
          cardAL2: "想先装起来",
          cardAL3: "再慢慢熟悉",
          cardB: "部署的人",
          cardBL1: "帮朋友搭环境",
          cardBL2: "不想重复解释",
          cardBL3: "每一步该点哪",
          cardC: "团队交付",
          cardCL1: "希望入口统一",
          cardCL2: "配置更一致",
          cardCL3: "排查更省事",
          footer: "把使用门槛降下来，才更容易让别人真的开始用"
        }
      },
      {
        fileName: "xhs-launch-06.svg",
        prompt: "首发介绍第 6 页收尾 CTA",
        templateId: "quote-cta",
        values: {
          eyebrow: "欢迎留言",
          title: "想看真实演示 可以继续发",
          subtitle: "我可以补 Windows / macOS 安装流程图、视频和更多界面细节",
          button: "想看演示可以留言",
          footer: "mid-mint x OpenClaw"
        }
      }
    ]
  },
  {
    id: "pain-points",
    name: "套图 B：痛点对比",
    note: "适合强调不会命令行也能装、也不用手改 JSON。",
    pages: [
      {
        fileName: "xhs-pain-01.svg",
        prompt: "痛点对比第 1 页封面",
        templateId: "quote-cta",
        values: {
          eyebrow: "高频痛点",
          title: "别再手改 openclaw.json",
          subtitle: "把安装和高频配置都做成界面，普通用户会安心很多",
          button: "先把门槛降下来",
          footer: "给 OpenClaw 做的桌面安装器"
        }
      },
      {
        fileName: "xhs-pain-02.svg",
        prompt: "痛点对比第 2 页传统流程",
        templateId: "step-list",
        values: {
          eyebrow: "传统流程",
          title: "以前为什么容易卡住",
          subtitle: "只要有一步没对上，后面就全是额外沟通成本",
          step1: "查环境",
          step2: "装 CLI",
          step3: "初始化",
          step4: "改配置文件",
          step5: "接模型和插件",
          footer: "步骤越分散，普通用户越难判断自己卡在哪一步"
        }
      },
      {
        fileName: "xhs-pain-03.svg",
        prompt: "痛点对比第 3 页现在的流程",
        templateId: "step-list",
        values: {
          eyebrow: "现在的流程",
          title: "现在的入口会顺很多",
          subtitle: "把文档里的高频动作收进同一个界面",
          step1: "打开安装器",
          step2: "自动检测状态",
          step3: "点安装或更新",
          step4: "在界面里填配置",
          step5: "开始用并看反馈",
          footer: "让用户沿着同一条路径走，排错和复现都会更简单"
        }
      },
      {
        fileName: "xhs-pain-04.svg",
        prompt: "痛点对比第 4 页常见卡点",
        templateId: "triple-cards",
        values: {
          eyebrow: "最容易卡住",
          title: "用户最容易卡住的点",
          subtitle: "真正耗时间的常常不是功能，而是装之前和装之后的那些小问题",
          cardA: "依赖问题",
          cardAL1: "Node 没装对",
          cardAL2: "pnpm 缺失",
          cardAL3: "版本不一致",
          cardB: "配置问题",
          cardBL1: "文件在哪",
          cardBL2: "字段怎么填",
          cardBL3: "路径往哪写",
          cardC: "状态问题",
          cardCL1: "插件装没装上",
          cardCL2: "为什么失败",
          cardCL3: "下一步做什么",
          footer: "能把状态说清楚，用户就不会一直猜"
        }
      },
      {
        fileName: "xhs-pain-05.svg",
        prompt: "痛点对比第 5 页为什么图形界面更友好",
        templateId: "story-split",
        values: {
          eyebrow: "为什么更友好",
          title: "图形界面不是炫技 是降低理解成本",
          subtitle: "把原本零散的步骤和反馈变成更稳定的入口",
          leftLabel: "用户视角",
          leftTitle: "更容易理解 更容易上手",
          leftBody: "用户不用先研究文档和配置结构，只要沿着界面往下走就够了",
          rightLabel: "交付视角",
          rightTitle: "更容易复现 更容易排错",
          rightBody: "所有人走相同路径 出问题时也更容易知道该看哪一层状态",
          footer: "流程设计得越清楚，传播和推荐就越轻松"
        }
      },
      {
        fileName: "xhs-pain-06.svg",
        prompt: "痛点对比第 6 页收尾",
        templateId: "quote-cta",
        values: {
          eyebrow: "如果你也在推荐",
          title: "先把安装门槛降下来 传播会顺很多",
          subtitle: "功能再强，也要先让更多人顺利走完第一次安装和配置",
          button: "想看流程图可以留言",
          footer: "安装体验决定第一印象"
        }
      }
    ]
  },
  {
    id: "team-delivery",
    name: "套图 C：团队交付",
    note: "适合发给有部署和交付诉求的团队用户。",
    pages: [
      {
        fileName: "xhs-team-01.svg",
        prompt: "团队交付第 1 页封面",
        templateId: "team-delivery",
        values: {
          eyebrow: "团队交付场景",
          title: "给团队交付 OpenClaw 需要一个统一入口",
          subtitle: "安装 / 配置 / 插件 / workspace 别让每个人各配各的",
          cardA: "环境统一",
          cardALine1: "少一些",
          cardALine2: "机器差异带来的",
          cardALine3: "安装问题",
          cardB: "流程统一",
          cardBLine1: "从检测到配置",
          cardBLine2: "步骤更容易",
          cardBLine3: "复现",
          cardC: "状态统一",
          cardCLine1: "插件安装中",
          cardCLine2: "成功失败",
          cardCLine3: "更直观",
          lead: "更适合这些人：",
          bullet1: "- 帮同事搭环境的人",
          bullet2: "- 想做统一安装入口的团队负责人",
          bullet3: "- 需要 agent bundle 的交付场景",
          footer: "桌面安装器的价值，不只是能装上，而是更容易交付"
        }
      },
      {
        fileName: "xhs-team-02.svg",
        prompt: "团队交付第 2 页为什么难",
        templateId: "triple-cards",
        values: {
          eyebrow: "为什么交付难",
          title: "一进团队场景 问题就不只是安装了",
          subtitle: "真正麻烦的是每个人机器和习惯不同，结果很难对齐",
          cardA: "机器不同",
          cardAL1: "系统不同",
          cardAL2: "环境不同",
          cardAL3: "依赖也不同",
          cardB: "习惯不同",
          cardBL1: "有人会命令行",
          cardBL2: "有人完全不碰",
          cardBL3: "理解成本不同",
          cardC: "结果不同",
          cardCL1: "配置不一致",
          cardCL2: "路径不统一",
          cardCL3: "插件状态难追",
          footer: "只要交付对象一多，入口不统一就会放大沟通成本"
        }
      },
      {
        fileName: "xhs-team-03.svg",
        prompt: "团队交付第 3 页统一入口价值",
        templateId: "story-split",
        values: {
          eyebrow: "统一入口能解决",
          title: "把安装和配置都收进一个入口",
          subtitle: "不是让流程变复杂，而是让不同人走同一条路径",
          leftLabel: "对团队成员",
          leftTitle: "步骤更清楚",
          leftBody: "从环境检测到模型配置，每一步都知道该点哪里 看到什么结果",
          rightLabel: "对交付人",
          rightTitle: "状态更一致",
          rightBody: "插件、workspace 和常用配置更容易对齐 更新和排查也更标准化",
          footer: "统一入口本质上是在减少重复答疑和重复返工"
        }
      },
      {
        fileName: "xhs-team-04.svg",
        prompt: "团队交付第 4 页更适合谁",
        templateId: "triple-cards",
        values: {
          eyebrow: "更适合谁",
          title: "哪些角色会更需要它",
          subtitle: "越需要把能力交到别人手里，越需要一个更清晰的入口",
          cardA: "团队管理员",
          cardAL1: "统一初始环境",
          cardAL2: "减少返工",
          cardAL3: "方便升级",
          cardB: "内部工具负责人",
          cardBL1: "入口清楚",
          cardBL2: "步骤稳定",
          cardBL3: "更好支持同事",
          cardC: "帮同事搭环境的人",
          cardCL1: "少解释",
          cardCL2: "少截图",
          cardCL3: "少远程排错",
          footer: "交付这件事越标准化，团队越容易真正用起来"
        }
      },
      {
        fileName: "xhs-team-05.svg",
        prompt: "团队交付第 5 页现在支持",
        templateId: "step-list",
        values: {
          eyebrow: "现在已经支持",
          title: "当前这版已经能覆盖这些交付动作",
          subtitle: "先把高频动作做实，再慢慢补更深的团队能力",
          step1: "插件预设安装",
          step2: "agent bundle 导入",
          step3: "agent bundle 导出",
          step4: "workspace 选择",
          step5: "选择性卸载",
          footer: "先把最常用的交付动作标准化，已经能省掉很多沟通"
        }
      },
      {
        fileName: "xhs-team-06.svg",
        prompt: "团队交付第 6 页收尾",
        templateId: "quote-cta",
        values: {
          eyebrow: "如果你也在做交付",
          title: "欢迎交流你最需要哪些配置和流程",
          subtitle: "我会继续把交付里最容易反复解释的环节，做成更好理解的入口",
          button: "可以继续交流需求",
          footer: "交付体验也是产品体验"
        }
      }
    ]
  }
];
