export const Script = ({ children }) => {
  const functionCode = children.toString();
  const bodyMatch = functionCode.match(/\{([\s\S]*)\}/);
  const functionBody = bodyMatch ? bodyMatch[1].trim() : "";
  return (
    <script type="module">
      {functionBody}
    </script>
  );
};
