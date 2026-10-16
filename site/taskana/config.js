/* =====================================================================
   Taskana — deployment settings.

   Leave entra.clientId empty and Taskana runs as a standalone demo:
   simulated Microsoft sign-in, email + demo password, data in this
   browser only.

   Fill it in and Taskana signs people in with Microsoft Entra ID and
   keeps its data files in the company OneDrive (see README, "Taskana →
   Microsoft 365 setup"). An Admin can also try settings out in one
   browser from the sign-in screen (Microsoft 365 connection…) before
   committing them here.
   ===================================================================== */
var TASKANA_CONFIG = {
  /* only accounts with this ending may sign in */
  domain: "@galiltc.co.il",

  entra: {
    clientId: "",          // Application (client) ID of the Taskana app registration
    tenantId: ""           // Directory (tenant) ID of galiltc.co.il; empty = any work account (domain still enforced)
  },

  onedrive: {
    /* Sharing link ("People in GALIL with the link can edit") to the folder that holds Taskana's
       data files. Everyone who signs in must be able to edit it. Leave empty to use a folder
       named folderName in the signed-in person's own OneDrive (fine for trying it out alone). */
    folderLink: "",
    folderName: "Taskana",
    fileName: "taskana-data.json"
  }
};
