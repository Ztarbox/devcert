"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Note that ES6 modules cannot directly export class objects.
const prompt = require("password-prompt");
const utils_1 = require("./utils");
const DefaultUI = {
    async getWindowsEncryptionPassword() {
        return await prompt('devcert password (http://bit.ly/devcert-what-password?):');
    },
    warnChromeOnLinuxWithoutCertutil() {
        console.warn(`
      WARNING: It looks like you have Chrome installed, but you specified
      'skipCertutilInstall: true'. Unfortunately, without installing
      certutil, it's impossible get Chrome to trust devcert's certificates
      The certificates will work, but Chrome will continue to warn you that
      they are untrusted.
    `);
    },
    closeFirefoxBeforeContinuing() {
        console.log('Please close Firefox before continuing');
    },
    async startFirefoxWizard(certificateHost) {
        console.log(`
      devcert was unable to automatically configure Firefox. You'll need to
      complete this process manually. Don't worry though - Firefox will walk
      you through it.

      When you're ready, hit any key to continue. Firefox will launch and
      display a wizard to walk you through how to trust the devcert
      certificate. When you are finished, come back here and we'll finish up.

      (If Firefox doesn't start, go ahead and start it and navigate to
      ${certificateHost} in a new tab.)

      If you are curious about why all this is necessary, check out
      https://github.com/davewasmer/devcert#how-it-works

      <Press any key to launch Firefox wizard>
    `);
        await utils_1.waitForUser();
    },
    firefoxWizardPromptPage(certificateURL) {
        return `
      <html>
        <head>
          <meta http-equiv="refresh" content="0; url=${certificateURL}" />
        </head>
      </html>
    `;
    },
    async waitForFirefoxWizard() {
        console.log(`
      Launching Firefox ...

      Great! Once you've finished the Firefox wizard for adding the devcert
      certificate, just hit any key here again and we'll wrap up.

      <Press any key to continue>
    `);
        await utils_1.waitForUser();
    }
};
exports.default = DefaultUI;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlci1pbnRlcmZhY2UuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInVzZXItaW50ZXJmYWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsOERBQThEO0FBQzlELDBDQUEyQztBQUMzQyxtQ0FBc0M7QUFxQnRDLE1BQU0sU0FBUyxHQUFrQjtJQUMvQixLQUFLLENBQUMsNEJBQTRCO1FBQ2hDLE9BQU8sTUFBTSxNQUFNLENBQ2pCLDBEQUEwRCxDQUMzRCxDQUFDO0lBQ0osQ0FBQztJQUNELGdDQUFnQztRQUM5QixPQUFPLENBQUMsSUFBSSxDQUFDOzs7Ozs7S0FNWixDQUFDLENBQUM7SUFDTCxDQUFDO0lBQ0QsNEJBQTRCO1FBQzFCLE9BQU8sQ0FBQyxHQUFHLENBQUMsd0NBQXdDLENBQUMsQ0FBQztJQUN4RCxDQUFDO0lBQ0QsS0FBSyxDQUFDLGtCQUFrQixDQUFDLGVBQWU7UUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQzs7Ozs7Ozs7OztRQVVSLGVBQWU7Ozs7OztLQU1sQixDQUFDLENBQUM7UUFDSCxNQUFNLG1CQUFXLEVBQUUsQ0FBQztJQUN0QixDQUFDO0lBQ0QsdUJBQXVCLENBQUMsY0FBc0I7UUFDNUMsT0FBTzs7O3VEQUc0QyxjQUFjOzs7S0FHaEUsQ0FBQztJQUNKLENBQUM7SUFDRCxLQUFLLENBQUMsb0JBQW9CO1FBQ3hCLE9BQU8sQ0FBQyxHQUFHLENBQUM7Ozs7Ozs7S0FPWCxDQUFDLENBQUM7UUFDSCxNQUFNLG1CQUFXLEVBQUUsQ0FBQztJQUN0QixDQUFDO0NBQ0YsQ0FBQztBQUVGLGtCQUFlLFNBQVMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIE5vdGUgdGhhdCBFUzYgbW9kdWxlcyBjYW5ub3QgZGlyZWN0bHkgZXhwb3J0IGNsYXNzIG9iamVjdHMuXHJcbmltcG9ydCBwcm9tcHQgPSByZXF1aXJlKCdwYXNzd29yZC1wcm9tcHQnKTtcclxuaW1wb3J0IHsgd2FpdEZvclVzZXIgfSBmcm9tICcuL3V0aWxzJztcclxuXHJcbi8qKlxyXG4gKiBBIHJlcHJlc2VudGF0aW9uIG9mIHNldmVyYWwgcGFydHMgb2YgdGhlIGxvY2FsIHN5c3RlbSB0aGF0IHRoZSB1c2VyIGludGVyYWN0cyB3aXRoXHJcbiAqIEBwdWJsaWNcclxuICovXHJcbmV4cG9ydCBpbnRlcmZhY2UgVXNlckludGVyZmFjZSB7XHJcbiAgLyoqIEdldCB0aGUgZGlzayBlbmNyeXB0aW9uIHBhc3N3b3JkICh3aW5kb3dzIG9ubHkpICovXHJcbiAgZ2V0V2luZG93c0VuY3J5cHRpb25QYXNzd29yZCgpOiBzdHJpbmcgfCBQcm9taXNlPHN0cmluZz47XHJcbiAgLyoqIERlbGl2ZXIgYSB3YXJuaW5nIHRvIHRoZSB1c2VyIHdpdGhvdXQgdXNpbmcgY2VydHV0aWwgKGxpbnV4IG9ubHkpICovXHJcbiAgd2FybkNocm9tZU9uTGludXhXaXRob3V0Q2VydHV0aWwoKTogdm9pZCB8IFByb21pc2U8dm9pZD47XHJcbiAgLyoqIENsb3NlIGZpcmVmb3ggKi9cclxuICBjbG9zZUZpcmVmb3hCZWZvcmVDb250aW51aW5nKCk6IHZvaWQgfCBQcm9taXNlPHZvaWQ+O1xyXG4gIC8qKiBCZWdpbiB0aGUgcHJvY2VzcyBvZiBhcHByb3ZpbmcgYSBjZXJ0IHRocm91Z2ggZmlyZWZpeCAqL1xyXG4gIHN0YXJ0RmlyZWZveFdpemFyZChjZXJ0aWZpY2F0ZUhvc3Q6IHN0cmluZyk6IHZvaWQgfCBQcm9taXNlPHZvaWQ+O1xyXG4gIC8qKiBMb2FkIHRoZSBjZXJ0IGFwcHJvdmFsIHBhZ2UgaW4gdGhlIHVzZXIncyBsb2NhbCBmaXJlZm94ICovXHJcbiAgZmlyZWZveFdpemFyZFByb21wdFBhZ2UoY2VydGlmaWNhdGVVUkw6IHN0cmluZyk6IHN0cmluZyB8IFByb21pc2U8c3RyaW5nPjtcclxuICAvKiogV2FpdCBmb3IgdGhlIHVzZXIgdG8gY29tcGxldGUgdGhlIGZpcmVmb3ggY2VydCBhcHByb3ZhbCB3aXphcmQgKi9cclxuICB3YWl0Rm9yRmlyZWZveFdpemFyZCgpOiB2b2lkIHwgUHJvbWlzZTx2b2lkPjtcclxufVxyXG5cclxuY29uc3QgRGVmYXVsdFVJOiBVc2VySW50ZXJmYWNlID0ge1xyXG4gIGFzeW5jIGdldFdpbmRvd3NFbmNyeXB0aW9uUGFzc3dvcmQoKSB7XHJcbiAgICByZXR1cm4gYXdhaXQgcHJvbXB0KFxyXG4gICAgICAnZGV2Y2VydCBwYXNzd29yZCAoaHR0cDovL2JpdC5seS9kZXZjZXJ0LXdoYXQtcGFzc3dvcmQ/KTonXHJcbiAgICApO1xyXG4gIH0sXHJcbiAgd2FybkNocm9tZU9uTGludXhXaXRob3V0Q2VydHV0aWwoKSB7XHJcbiAgICBjb25zb2xlLndhcm4oYFxyXG4gICAgICBXQVJOSU5HOiBJdCBsb29rcyBsaWtlIHlvdSBoYXZlIENocm9tZSBpbnN0YWxsZWQsIGJ1dCB5b3Ugc3BlY2lmaWVkXHJcbiAgICAgICdza2lwQ2VydHV0aWxJbnN0YWxsOiB0cnVlJy4gVW5mb3J0dW5hdGVseSwgd2l0aG91dCBpbnN0YWxsaW5nXHJcbiAgICAgIGNlcnR1dGlsLCBpdCdzIGltcG9zc2libGUgZ2V0IENocm9tZSB0byB0cnVzdCBkZXZjZXJ0J3MgY2VydGlmaWNhdGVzXHJcbiAgICAgIFRoZSBjZXJ0aWZpY2F0ZXMgd2lsbCB3b3JrLCBidXQgQ2hyb21lIHdpbGwgY29udGludWUgdG8gd2FybiB5b3UgdGhhdFxyXG4gICAgICB0aGV5IGFyZSB1bnRydXN0ZWQuXHJcbiAgICBgKTtcclxuICB9LFxyXG4gIGNsb3NlRmlyZWZveEJlZm9yZUNvbnRpbnVpbmcoKSB7XHJcbiAgICBjb25zb2xlLmxvZygnUGxlYXNlIGNsb3NlIEZpcmVmb3ggYmVmb3JlIGNvbnRpbnVpbmcnKTtcclxuICB9LFxyXG4gIGFzeW5jIHN0YXJ0RmlyZWZveFdpemFyZChjZXJ0aWZpY2F0ZUhvc3QpIHtcclxuICAgIGNvbnNvbGUubG9nKGBcclxuICAgICAgZGV2Y2VydCB3YXMgdW5hYmxlIHRvIGF1dG9tYXRpY2FsbHkgY29uZmlndXJlIEZpcmVmb3guIFlvdSdsbCBuZWVkIHRvXHJcbiAgICAgIGNvbXBsZXRlIHRoaXMgcHJvY2VzcyBtYW51YWxseS4gRG9uJ3Qgd29ycnkgdGhvdWdoIC0gRmlyZWZveCB3aWxsIHdhbGtcclxuICAgICAgeW91IHRocm91Z2ggaXQuXHJcblxyXG4gICAgICBXaGVuIHlvdSdyZSByZWFkeSwgaGl0IGFueSBrZXkgdG8gY29udGludWUuIEZpcmVmb3ggd2lsbCBsYXVuY2ggYW5kXHJcbiAgICAgIGRpc3BsYXkgYSB3aXphcmQgdG8gd2FsayB5b3UgdGhyb3VnaCBob3cgdG8gdHJ1c3QgdGhlIGRldmNlcnRcclxuICAgICAgY2VydGlmaWNhdGUuIFdoZW4geW91IGFyZSBmaW5pc2hlZCwgY29tZSBiYWNrIGhlcmUgYW5kIHdlJ2xsIGZpbmlzaCB1cC5cclxuXHJcbiAgICAgIChJZiBGaXJlZm94IGRvZXNuJ3Qgc3RhcnQsIGdvIGFoZWFkIGFuZCBzdGFydCBpdCBhbmQgbmF2aWdhdGUgdG9cclxuICAgICAgJHtjZXJ0aWZpY2F0ZUhvc3R9IGluIGEgbmV3IHRhYi4pXHJcblxyXG4gICAgICBJZiB5b3UgYXJlIGN1cmlvdXMgYWJvdXQgd2h5IGFsbCB0aGlzIGlzIG5lY2Vzc2FyeSwgY2hlY2sgb3V0XHJcbiAgICAgIGh0dHBzOi8vZ2l0aHViLmNvbS9kYXZld2FzbWVyL2RldmNlcnQjaG93LWl0LXdvcmtzXHJcblxyXG4gICAgICA8UHJlc3MgYW55IGtleSB0byBsYXVuY2ggRmlyZWZveCB3aXphcmQ+XHJcbiAgICBgKTtcclxuICAgIGF3YWl0IHdhaXRGb3JVc2VyKCk7XHJcbiAgfSxcclxuICBmaXJlZm94V2l6YXJkUHJvbXB0UGFnZShjZXJ0aWZpY2F0ZVVSTDogc3RyaW5nKSB7XHJcbiAgICByZXR1cm4gYFxyXG4gICAgICA8aHRtbD5cclxuICAgICAgICA8aGVhZD5cclxuICAgICAgICAgIDxtZXRhIGh0dHAtZXF1aXY9XCJyZWZyZXNoXCIgY29udGVudD1cIjA7IHVybD0ke2NlcnRpZmljYXRlVVJMfVwiIC8+XHJcbiAgICAgICAgPC9oZWFkPlxyXG4gICAgICA8L2h0bWw+XHJcbiAgICBgO1xyXG4gIH0sXHJcbiAgYXN5bmMgd2FpdEZvckZpcmVmb3hXaXphcmQoKSB7XHJcbiAgICBjb25zb2xlLmxvZyhgXHJcbiAgICAgIExhdW5jaGluZyBGaXJlZm94IC4uLlxyXG5cclxuICAgICAgR3JlYXQhIE9uY2UgeW91J3ZlIGZpbmlzaGVkIHRoZSBGaXJlZm94IHdpemFyZCBmb3IgYWRkaW5nIHRoZSBkZXZjZXJ0XHJcbiAgICAgIGNlcnRpZmljYXRlLCBqdXN0IGhpdCBhbnkga2V5IGhlcmUgYWdhaW4gYW5kIHdlJ2xsIHdyYXAgdXAuXHJcblxyXG4gICAgICA8UHJlc3MgYW55IGtleSB0byBjb250aW51ZT5cclxuICAgIGApO1xyXG4gICAgYXdhaXQgd2FpdEZvclVzZXIoKTtcclxuICB9XHJcbn07XHJcblxyXG5leHBvcnQgZGVmYXVsdCBEZWZhdWx0VUk7XHJcbiJdfQ==