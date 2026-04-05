export function buildBackgroundPrompt(userPrompt: string, templateName: string) {
  return [
    "生成一张适合中文小红书海报的抽象背景图。",
    `主题：${userPrompt}`,
    `版式：${templateName}`,
    "要求：深海蓝、薄荷青、虾橙色点缀，保留大面积留白，避免人物和文字，适合做海报背景。"
  ].join("\n");
}
