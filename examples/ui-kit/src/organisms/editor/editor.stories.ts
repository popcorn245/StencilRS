import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Components/Organisms/Editor',
  component: 'pop-editor',
};

export default meta;

export const Default: StoryObj = {
  name: 'Default',
  render: () => `
    <pop-editor></pop-editor>
  `,
};

export const WithRichContent: StoryObj = {
  name: 'With Rich Content',
  render: () => `
    <pop-editor 
      users='[{"id":"u1","displayName":"Alice"},{"id":"u2","displayName":"Bob"}]'
      tags='[{"name":"feature"},{"name":"bug"}]'
      activities='[{"id":"a1","title":"Code Review"}]'
      value='{"time":1699999999999,"blocks":[{"id":"abc","type":"header","data":{"text":"Welcome to Editor.js in Stencil!","level":2}},{"id":"def","type":"paragraph","data":{"text":"This component wraps Editor.js natively as a web component. Try typing <b>/</b> to see block options, or <b>@</b> to mention a user."}},{"id":"ghi","type":"list","data":{"style":"unordered","items":["Provides rich text editing","Custom blocks like Checklists and Monaco code editors","Multi-block selection for batch actions"]}},{"id":"jkl","type":"checklist","data":{"items":[{"text":"Finish the ring menu","checked":true},{"text":"Write the editor stories","checked":false}]}}],"version":"2.30.7"}'
    ></pop-editor>
  `,
};

export const NotesAppMode: StoryObj = {
  name: 'Notes-app (WS3): checklist + wikilinks + Assistant slash',
  render: () => `
    <p style="max-width:800px;margin:0 auto 1rem;text-align:left;opacity:.7;font-size:.85rem;">
      The notes-app editor: <code>disable="ai,task"</code>, <code>wikilinks</code>, and
      <code>assistant-slash</code>. The checklist block now renders (was
      "can not be displayed correctly" before WS3 registered it). Open the "+" / slash
      menu to see <strong>Ask the Assistant</strong> — it dispatches
      <code>notes-app:open-assistant</code> (verb build) instead of inserting a block.
    </p>
    <pop-editor
      disable="ai,task"
      wikilinks
      assistant-slash
      value='{"time":1699999999999,"blocks":[{"id":"h1","type":"header","data":{"text":"Launch checklist","level":2}},{"id":"c1","type":"checklist","data":{"items":[{"text":"Register the checklist tool","checked":true},{"text":"Style the code cell","checked":true},{"text":"Ship WS3","checked":false}]}},{"id":"p1","type":"paragraph","data":{"text":"Type [[ to link a note, or / to open the block menu."}}],"version":"2.30.7"}'
    ></pop-editor>
  `,
};

export const Usage: StoryObj = {
  name: 'Usage Guide',
  render: () => `
    <article style="max-width: 800px; margin: 0 auto; text-align: left;">
      <h2>pop-editor</h2>
      <p>This is the core editing experience across the App. It utilizes Editor.js to provide a block-based document editor.</p>
      
      <h3>Key Features</h3>
      <ul>
        <li><strong>Block-based:</strong> Content is structured as a list of discrete blocks (headers, paragraphs, lists, code, etc)</li>
        <li><strong>Monaco Code Editor:</strong> Embed fully syntax-highlighted code editors with <code>/code</code></li>
        <li><strong>Autocompletes:</strong> Type <code>@</code> for users, <code>#</code> for tags, or <code>/</code> for block types.</li>
        <li><strong>Checklists with Activities:</strong> Use the checklist block and link specific tasks to tracked application activities.</li>
        <li><strong>Multi-select:</strong> Shift+Click or drag to select multiple blocks, enabling bulk assignment, tagging, or moving.</li>
      </ul>

      <h3>Props</h3>
      <table>
        <thead>
          <tr>
            <th>Prop</th>
            <th>Type</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>value</code></td>
            <td><code>string</code></td>
            <td>JSON string of the EditorJS document OutputData.</td>
          </tr>
          <tr>
            <td><code>users</code></td>
            <td><code>string</code></td>
            <td>JSON string of available users array.</td>
          </tr>
          <tr>
            <td><code>tags</code></td>
            <td><code>string</code></td>
            <td>JSON string of available tags array.</td>
          </tr>
          <tr>
            <td><code>activities</code></td>
            <td><code>string</code></td>
            <td>JSON string of available activities array.</td>
          </tr>
        </tbody>
      </table>

      <h3>Events</h3>
      <ul>
        <li><code>@editorChange</code> - Fired roughly 1 second after edits stop, returning the full JSON structure.</li>
      </ul>
      
      <h3>Public Methods</h3>
      <ul>
         <li><code>getEditorBlocks()</code> - Force resolution and return the current block data.</li>
         <li><code>dangerouslyUpdateEditor(data)</code> - Overwrite the entire editor contents.</li>
         <li><code>focusLastBlock()</code> - Move the caret to the end of the document.</li>
      </ul>
    </article>
  `
};
