/* If you're feeling fancy you can add interactivity 
    to your site with Javascript */

    window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then(
        result => {
          if (!result) {
            showError("No platform authenticator found. If your OS does not come with one, try using devtools to set one up.");
          }
        }
      );
      
      
      let abortController;
      let abortSignal;
      
      let startConditionalRequest = async () => {
        if (window.PublicKeyCredential.isConditionalMediationAvailable) {
          console.log("Conditional UI is understood by the browser");
          if (!await window.PublicKeyCredential.isConditionalMediationAvailable()) {
            showError("Conditional UI is understood by your browser but not available");
            return;
          }
        } else {
          // Normally, this would mean Conditional Mediation is not available. However, the "current"
          // development implementation on chrome exposes availability via
          // navigator.credentials.conditionalMediationSupported. You won't have to add this code
          // by the time the feature is released.
          if (!navigator.credentials.conditionalMediationSupported) {
            showError("Your browser does not implement Conditional UI (are you running the right chrome/safari version with the right flags?)");
            return;
          } else {
            console.log("This browser understand the old version of Conditional UI feature detection");
          }
        }
        abortController = new AbortController();
        abortSignal = abortController.signal;
        
        try {
          let credential = await navigator.credentials.get({
            signal: abortSignal,
            publicKey: {
              // Don't do this in production!
              challenge: new Uint8Array([1, 2, 3, 4])
            },
            mediation: "conditional"
          });
          if (credential) {
            let username = String.fromCodePoint(...new Uint8Array(credential.response.userHandle));
            window.location = "site.html?username=" + username;
          } else {
            showError("Credential returned null");
          }
        } catch (error) {
          if (error.name == "AbortError") {
            console.log("request aborted");
            return;
          }
          showError(error.toString());
        }
      }
      
      let startNormalRequest = () => {
        console.log('starting webauthn conditional ui request');
        navigator.credentials.get({
          publicKey: {
            // don't do this in production!
            challenge: new Uint8Array([1, 2, 3, 4])
          },
        }).then(credential => {
          if (credential) {
            let username = String.fromCodePoint(...new Uint8Array(credential.response.userHandle));
            window.location = "site.html?username=" + username;
          } else {
            showError("Credential returned null");
          }
        }).catch(error => {
          showError(error.toString());
        }).finally(() => {
          startConditionalRequest();
        });
      }
      
      let startAutoSigninDialogRequest = async () => {
        console.log("attempting non-webauthn credential manager api dialog")
        if (window.PasswordCredential || window.FederatedCredential) {
          // Actual Credential Management API call to get credential object
          const cred = await navigator.credentials.get({
            password: true,
            federated: {
              providers: [GOOGLE_SIGNIN, FACEBOOK_LOGIN]
            },
            mediation: silent ? 'silent' : 'optional'
          });
          // If credential object is available
          if (cred) {
            console.log('auto sign-in performed');
            console.log(cred.toString());
      
            // let promise;
            // switch (cred.type) {
            //   case 'password':
            //     // If `password` prop doesn't exist, this is Chrome < 60
            //     if (cred.password === undefined) {
            //       cred.idName = 'email';
            //       promise = app._fetch(PASSWORD_LOGIN, cred);
      
            //     // Otherwise, this is Chrome => 60
            //     } else {
            //       // Change form `id` name to `email`
            //       const form = new FormData();
            //       form.append('email', cred.id);
            //       form.append('password', cred.password);
            //       promise = app._fetch(PASSWORD_LOGIN, form);
            //     }
            //     break;
            //   case 'federated':
            //     switch (cred.provider) {
            //       case GOOGLE_SIGNIN:
            //         // Return Promise from `gSignIn`
            //         promise = app.gSignIn(cred.id);
            //         break;
            //       case FACEBOOK_LOGIN:
            //         // Return Promise from `fbSignIn`
            //         promise = app.fbSignIn();
            //         break;
            //     }
            //     break;
            // }
            // if (promise) {
            //   return promise.then(app.signedIn);
            // } else {
            //   return Promise.resolve();
            // }
          } else {
            console.log('auto sign-in not performed');
      
            // Resolve if credential object is not available
            return Promise.resolve();
          }
        } else {
          // Resolve if Credential Management API is not available
          return Promise.resolve();
        }
      }

      let _fetch = async function(provider, c = new FormData()) {
        let url = './site.html';
      
        const res = await fetch(url, {
          method: 'POST',
          // `credentials:'include'` is required to include cookies on `fetch`
          credentials: 'include',
          headers: {
            // `X-Requested-With` header to avoid CSRF attacks
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: c
        });
        // Convert JSON string to an object
        if (res.status === 200) {
          return res.json();
        } else {
          return Promise.reject();
        }
      };

      startConditionalRequest();
      
      document.getElementById("manual-login").addEventListener("click", (e) => {
        e.preventDefault();
        if (abortController) {
          console.log("aborting request & starting new one");
          // Abort the request synchronously.
          // This lets us use the user activation from clicking the button on safari to trigger webauthn.
          abortController.abort();
        }
        startNormalRequest();
      });